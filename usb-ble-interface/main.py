from enum import Enum, unique, Flag
import time
import multiprocessing
import requests
import urllib3

from utils.get_moves import get_moves
from utils import reader_writer, usbtool
from utils import logger
from utils.reader_writer import Piece

from ble_tool import startBLETool

import chess.pgn

@unique
class State(Enum):
    Init = 1
    Connecting = 2
    Calibration = 3
    NewGame = 4
    WaitingForInput = 5
    EndOfGame = 6
    Done = 7


if __name__ == "__main__":
    multiprocessing.freeze_support()
    logger.set_logger()

    # Globals (for now)
    CONNECTION_ADDRESS = None
    CHESSBOARD_CONNECTION_PROCESS = None
    USB_READER = None
    LED_MANAGER = None
    VIRTUAL_BOARD = None
    CURRENT_CODES = None
    LAST_MOVE = None
    QUEUE = None
    ROTATED = False
    NEW_GAME = False
    GAME_ID = 0
    URL = "https://liff.us-west-2.elasticbeanstalk.com/"
    DO_PUBLISH = False

    def waitFor(seconds):
        time.sleep(seconds)

    def stateConnecting(state):
        print("stateConnecting")
        assert(state == State.Connecting)

        global CONNECTION_ADDRESS
        global CHESSBOARD_CONNECTION_PROCESS
        global USB_READER
        global LED_MANAGER
        global QUEUE
        global NEW_GAME
        global GAME_ID

        CONNECTION_ADDRESS = usbtool.find_address()

        CHESSBOARD_CONNECTION_PROCESS = usbtool.start_usbtool(
            CONNECTION_ADDRESS, separate_process=True
        )

        waitFor(seconds=0.3)

        while usbtool.QUEUE_FROM_USBTOOL.empty():
            # Wait for connection
            waitFor(seconds=0.1)

        USB_READER = reader_writer.BoardReader(CONNECTION_ADDRESS)
        LED_MANAGER = reader_writer.LedWriter()

        QUEUE = startBLETool()

        LED_MANAGER.set_leds("all")
        waitFor(seconds=1)
        LED_MANAGER.set_leds()

        if USB_READER.needs_calibration:
            return State.Calibration
        else:
            return State.NewGame

    def stateCalibrating(state):
        print("stateCalibrating")
        assert(state == State.Calibration)

        USB_READER.read_board(update=True)

        while not USB_READER.calibration(new_setup=True, verbose=True):
            # print("Trying to calibrate")
            USB_READER.read_board(update=True)
            # waitFor(seconds=0.5)

        return State.NewGame

    def rotate(x):
        return x[::-1]

    def publishMove(move):
        global GAME_ID
        global NEW_GAME
        global DO_PUBLISH

        if DO_PUBLISH:
            if NEW_GAME:
                newgame = {"title": "auto-generated"}
                res = requests.post(URL + "games/", json=newgame, verify=False)
                GAME_ID = res.json()["id"]
                print("gameid=", GAME_ID)
                NEW_GAME = False
            newmove = {
                "gameID": GAME_ID,
                "pgn": move
            }
            res = requests.post(URL + "moves/", json=newmove, verify=False)

    def stateNewGame(state):
        print("stateNewGame")
        assert(state == State.NewGame)

        global VIRTUAL_BOARD
        global LAST_MOVE
        global ROTATED
        global NEW_GAME
        global CURRENT_CODES

        LAST_MOVE = None
        NEW_GAME = True

        LED_MANAGER.set_leds("corners")

        (current_fen, _) = USB_READER.read_board()

        VIRTUAL_BOARD = chess.Board()

        print("about to spin")
        while VIRTUAL_BOARD.board_fen() != current_fen and VIRTUAL_BOARD.board_fen() != rotate(current_fen):
            #print("spinning", current_fen)
            (current_fen, _) = USB_READER.read_board(update=True)
            waitFor(seconds=0.1)

        if VIRTUAL_BOARD.board_fen() == rotate(current_fen):
            ROTATED = True
        else:
            ROTATED = False

        print("done")
        LED_MANAGER.set_leds("newgame")

        CURRENT_CODES = USB_READER.get_codes()

        if ROTATED:
            CURRENT_CODES = rotate(CURRENT_CODES)

        return State.WaitingForInput

    def stateWaitingForInput(state):
        # print("stateWaitingForInput")
        assert(state == State.WaitingForInput)

        global LAST_MOVE
        global QUEUE
        global ROTATED
        global CURRENT_CODES

        # It's checkmate or a repetition
        outcome = VIRTUAL_BOARD.outcome(claim_draw=False)
        if outcome != None:
            USB_READER.data_to_fen()

            if outcome.winner == chess.WHITE:
                LED_MANAGER.set_leds(["d3", "d4", "e3", "e4"], ROTATED)
                print("winner white")
            elif  outcome.winner == chess.BLACK:
                LED_MANAGER.set_leds(["d5", "d6", "e5", "e6"], ROTATED)
                print("winner black")
            else:
                LED_MANAGER.set_leds("center")

            return state.EndOfGame

        check_squares = []

        if VIRTUAL_BOARD.is_check():
            checked_king_square = chess.SQUARE_NAMES[
                VIRTUAL_BOARD.king(VIRTUAL_BOARD.turn)
            ]
            LED_MANAGER.set_leds(
                LAST_MOVE + [checked_king_square], ROTATED
            )
            check_squares.append(checked_king_square)
        elif LAST_MOVE:
            LED_MANAGER.set_leds(LAST_MOVE, ROTATED)

        # Read the board
        (new_fen, new_codes) = USB_READER.read_board(update=True, rotate180=ROTATED)
        moves = get_moves(VIRTUAL_BOARD, new_fen, CURRENT_CODES, new_codes, check_double_moves=True)

        misplaced_pieces = False

        while not moves:
            highligted_leds = False

            if CURRENT_CODES != new_codes:
                # Highlight any missing pieces
                highligted_leds = LED_MANAGER.highlight_misplaced_pieces_exact(CURRENT_CODES, new_codes, ROTATED, False)

            if highligted_leds:
                misplaced_pieces = True

                outcome = checkForSpecialConditions(new_codes)

                if outcome == 0:
                    LED_MANAGER.set_leds("center")
                    return state.EndOfGame
                if outcome == 1:
                    LED_MANAGER.set_leds(["d3", "d4", "e3", "e4"], ROTATED)
                    print("winner white")
                    return state.EndOfGame
                if outcome == 2:
                    LED_MANAGER.set_leds(["d5", "d6", "e5", "e6"], ROTATED)
                    print("winner black")
                    return state.EndOfGame

            if not highligted_leds and LAST_MOVE:
                LED_MANAGER.set_leds(LAST_MOVE + check_squares, ROTATED)

            # if not misplaced_pieces:
            #     while not USB_READER.board_changed():
            #         pass

            (new_fen, new_codes) = USB_READER.read_board(update=True, rotate180=ROTATED)
            if CURRENT_CODES != new_codes:
                # print("Getting moves")
                moves = get_moves(VIRTUAL_BOARD, new_fen, CURRENT_CODES, new_codes, check_double_moves=True)
                # print("Got moves: ", moves)

        for move in moves:
            publishMove(move)
            print("pushing move: ", move)
            VIRTUAL_BOARD.push_uci(move)
            p1 = move[0] + move[1]
            p2 = move[2] + move[3]
            LED_MANAGER.set_leds([p1, p2], ROTATED)
            LAST_MOVE = [p1, p2]
            QUEUE.put(bytes(p1+p2, 'utf-8'))

        CURRENT_CODES = new_codes

        return state.WaitingForInput

    def checkForSpecialConditions(codes):
        COLUMNS_LETTERS = {"a":0, "b":1, "c":2, "d":3, "e":4, "f":5, "g":6, "h":7}

        draw = [("e4", "e5"), ("d4", "d5")]
        white = [("e4", "d5")]
        black = [("d4", "e5")]

        def piece(pos):
            idx = (9 - int(pos[1])) * 8 - COLUMNS_LETTERS[pos[0]] - 1
            #print("idx = ", idx, "pos = ", pos)
            return USB_READER.code_mapping_to_piece[codes[idx]]

        def tryPos(positions):
            for pos in positions:
                p1 = pos[0]
                p2 = pos[1]
                if (piece(p1) == Piece.K or piece(p1) == Piece.k) and (piece(p2) == Piece.K or piece(p2) == Piece.k):
                    return True
            return False

        is_draw = tryPos(draw)
        is_white_win = tryPos(white)
        is_black_win = tryPos(black)

        if is_draw:
            return 0
        elif is_white_win:
            return 1
        elif is_black_win:
            return 2
        else:
            return -1

    def stateEndOfGame(state):
        print("stateEndOfGame")

        global LAST_MOVE
        global VIRTUAL_BOARD
        global CURRENT_CODES

        VIRTUAL_BOARD = chess.Board()
        LAST_MOVE = None

        (current_fen, _) = USB_READER.read_board(update=True)

        print("about to spin")
        while VIRTUAL_BOARD.board_fen() != current_fen and VIRTUAL_BOARD.board_fen() != rotate(current_fen):
            print("spinning", current_fen)
            (current_fen, _) = USB_READER.read_board(update=True)
            waitFor(seconds=0.2)

        if VIRTUAL_BOARD.board_fen() == rotate(current_fen):
            ROTATED = True
        else:
            ROTATED = False

        CURRENT_CODES = USB_READER.get_codes()

        if ROTATED:
            CURRENT_CODES = rotate(CURRENT_CODES)

        print("pieces are back")
        LED_MANAGER.set_leds()

        return State.NewGame

    s = State.Connecting

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    while s != State.Done:
        if s == State.Connecting:
            s = stateConnecting(s)
        elif s == State.Calibration:
            s = stateCalibrating(s)
        elif s == State.NewGame:
            s = stateNewGame(s)
        elif s == State.WaitingForInput:
            s = stateWaitingForInput(s)
        elif s == State.EndOfGame:
            s = stateEndOfGame(s)
