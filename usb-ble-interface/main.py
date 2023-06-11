from enum import Enum, unique, Flag
import time
import multiprocessing

from utils.get_moves import get_moves
from utils import reader_writer, usbtool
from utils import logger

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

    def waitFor(seconds):
        time.sleep(seconds)

    def stateConnecting(state):
        print("stateConnecting")
        assert(state == State.Connecting)

        global CONNECTION_ADDRESS
        global CHESSBOARD_CONNECTION_PROCESS
        global USB_READER
        global LED_MANAGER

        CONNECTION_ADDRESS = usbtool.find_address()

        CHESSBOARD_CONNECTION_PROCESS = usbtool.start_usbtool(
            CONNECTION_ADDRESS, separate_process=True
        )

        waitFor(seconds=1)

        while usbtool.QUEUE_FROM_USBTOOL.empty():
            # Wait for connection
            waitFor(seconds=0.1)

        USB_READER = reader_writer.BoardReader(CONNECTION_ADDRESS)
        LED_MANAGER = reader_writer.LedWriter()

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

        while not USB_READER.calibration(True, True):
            print("Trying to calibrate")
            waitFor(seconds=1)

        return State.NewGame

    def stateNewGame(state):
        print("stateNewGame")
        assert(state == State.NewGame)

        global VIRTUAL_BOARD

        LED_MANAGER.set_leds("corners")

        current_fen = USB_READER.read_board()

        VIRTUAL_BOARD = chess.Board()

        print("about to spin")
        while VIRTUAL_BOARD.board_fen() != current_fen:
            print("spinning", current_fen)
            current_fen = USB_READER.read_board(update=True)
            waitFor(seconds=1)

        print("done")

        LED_MANAGER.set_leds()

        return State.WaitingForInput

    def stateWaitingForInput(state):
        print("stateWaitingForInput")
        assert(state == State.WaitingForInput)

        global LAST_MOVE

        # It's checkmate or a repetition
        if VIRTUAL_BOARD.is_game_over():
            LED_MANAGER.set_leds("center")
            return state.EndOfGame

        check_squares = []

        if VIRTUAL_BOARD.is_check():
            checked_king_square = chess.SQUARE_NAMES[
                VIRTUAL_BOARD.king(VIRTUAL_BOARD.turn)
            ]
            LED_MANAGER.set_leds(
                checked_king_square
            )
            check_squares.append(checked_king_square)
        elif LAST_MOVE:
            LED_MANAGER.set_leds(LAST_MOVE)


        new_fen = USB_READER.read_board()

        # print("legal moves: ", list(VIRTUAL_BOARD.generate_legal_moves()))

        moves = get_moves(
            VIRTUAL_BOARD, new_fen, check_double_moves=True
        )

        print(moves)

        while not moves:
            # waitFor(seconds=1)
            # there a a big problem...
            highligted_leds = (
                LED_MANAGER.highlight_misplaced_pieces(
                    new_fen,
                    VIRTUAL_BOARD,
                    False,
                    False,
                    True
                )
            )

            if not highligted_leds and LAST_MOVE:
                LED_MANAGER.set_leds(LAST_MOVE + check_squares)

            new_fen = USB_READER.read_board(update=True)

            moves = get_moves(
                VIRTUAL_BOARD, new_fen, check_double_moves=True
            )

            # print(moves)
            # print(new_fen)

        LED_MANAGER.set_leds();

        print("OUT OF LOOP: ", new_fen)

        for move in moves:
            VIRTUAL_BOARD.push_uci(move)
            p1 = move[0] + move[1]
            p2 = move[2] + move[3]
            LED_MANAGER.set_leds([p1, p2])
            LAST_MOVE = [p1, p2]
            # This is where we update the bluetooth component
            # BLUETOOTH_QUEUE.put(move)

        return state.WaitingForInput

    def stateEndOfGame(state):
        print("stateEndOfGame")
        LED_MANAGER.set_leds("thinking");

        VIRTUAL_BOARD = chess.Board()

        current_fen = USB_READER.read_board()

        print("about to spin")
        while VIRTUAL_BOARD.board_fen() != current_fen:
            print("spinning", current_fen)
            current_fen = USB_READER.read_board(update=True)
            waitFor(seconds=1)

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
