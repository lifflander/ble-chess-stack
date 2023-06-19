from enum import Enum, unique, Flag
import time
import multiprocessing

from utils.get_moves import get_moves
from utils import reader_writer, usbtool
from utils import logger

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
    LAST_MOVE = None
    QUEUE = None
    ROTATED = False

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

    def stateNewGame(state):
        print("stateNewGame")
        assert(state == State.NewGame)

        global VIRTUAL_BOARD
        global LAST_MOVE
        global ROTATED

        LAST_MOVE = None

        LED_MANAGER.set_leds("corners")

        current_fen = USB_READER.read_board()

        VIRTUAL_BOARD = chess.Board()

        print("about to spin")
        while VIRTUAL_BOARD.board_fen() != current_fen and VIRTUAL_BOARD.board_fen() != rotate(current_fen):
            print("spinning", current_fen)
            current_fen = USB_READER.read_board(update=True)
            waitFor(seconds=0.2)

        if VIRTUAL_BOARD.board_fen() == rotate(current_fen):
            ROTATED = True
        else:
            ROTATED = False

        print("done")
        LED_MANAGER.set_leds()

        return State.WaitingForInput

    def stateWaitingForInput(state):
        # print("stateWaitingForInput")
        assert(state == State.WaitingForInput)

        global LAST_MOVE
        global QUEUE
        global ROTATED

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

        # ret = USB_READER.update_find_move()
        # while ret == None:
        #     ret = USB_READER.update_find_move()

        # # print("ret=", ret)

        # if VIRTUAL_BOARD.is_legal(chess.Move.from_uci(ret[0] + ret[1])):
        #     print("directly moving on: ", ret[0], ret[1])
        #     VIRTUAL_BOARD.push_uci(ret[0] + ret[1])
        #     LED_MANAGER.set_leds(ret)
        #     LAST_MOVE = ret

        #     QUEUE.put(bytes(ret[0]+ret[1], 'utf-8'))

        #     return state.WaitingForInput

        # while not USB_READER.board_changed():
        #     pass

        new_fen = USB_READER.read_board(update=True)

        # print("legal moves: ", list(VIRTUAL_BOARD.generate_legal_moves()))

        if ROTATED:
            new_fen = rotate(new_fen)
        moves = get_moves(
            VIRTUAL_BOARD, new_fen, check_double_moves=True
        )

        misplaced_pieces = False

        while not moves:
            # waitFor(seconds=1)
            # there a a big problem...
            highligted_leds = (
                LED_MANAGER.highlight_misplaced_pieces(
                    new_fen,
                    VIRTUAL_BOARD,
                    ROTATED,
                    False,
                    False
                )
            )

            if highligted_leds:
                misplaced_pieces = True

            if not highligted_leds and LAST_MOVE:
                LED_MANAGER.set_leds(LAST_MOVE + check_squares, ROTATED)

            if not misplaced_pieces:
                while not USB_READER.board_changed():
                    pass

                new_fen = USB_READER.read_board(update=True)

                # print("legal moves 1: ", list(VIRTUAL_BOARD.generate_legal_moves()))
                # print("new fen 1:", new_fen)


                if ROTATED:
                    new_fen = rotate(new_fen)
                moves = get_moves(
                    VIRTUAL_BOARD, new_fen, check_double_moves=True
                )
            else:
                new_fen = USB_READER.read_board(update=True)

                # print("legal moves 2: ", list(VIRTUAL_BOARD.generate_legal_moves()))
                # print("new fen 2:", new_fen)

                if ROTATED:
                    new_fen = rotate(new_fen)
                moves = get_moves(
                    VIRTUAL_BOARD, new_fen, check_double_moves=True
                )

        # print("OUT OF LOOP: ", new_fen)

        for move in moves:
            print("pushing move: ", move)
            VIRTUAL_BOARD.push_uci(move)
            p1 = move[0] + move[1]
            p2 = move[2] + move[3]
            LED_MANAGER.set_leds([p1, p2], ROTATED)
            LAST_MOVE = [p1, p2]

            QUEUE.put(bytes(p1+p2, 'utf-8'))

        return state.WaitingForInput

    def stateEndOfGame(state):
        print("stateEndOfGame")

        global LAST_MOVE
        global VIRTUAL_BOARD

        VIRTUAL_BOARD = chess.Board()
        LAST_MOVE = None

        current_fen = USB_READER.read_board(update=True)

        print("about to spin")
        while VIRTUAL_BOARD.board_fen() != current_fen and VIRTUAL_BOARD.board_fen() != rotate(current_fen):
            print("spinning", current_fen)
            current_fen = USB_READER.read_board(update=True)
            waitFor(seconds=0.2)

        if VIRTUAL_BOARD.board_fen() == rotate(current_fen):
            ROTATED = True
        else:
            ROTATED = False

        print("pieces are back")
        LED_MANAGER.set_leds()

        return State.NewGame

    s = State.Connecting

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
