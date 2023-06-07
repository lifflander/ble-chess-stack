
from enum import Enum, unique, Flag
import time
import multiprocessing

from utils.get_moves import get_moves
from utils import reader_writer, usbtool

import chess.pgn

@unique
class State(Enum):
    Init = 1
    Connecting = 2
    Calibration = 3
    NewGame = 4
    WaitingForInput = 5
    EndOfGame = 6

# Globals (for now)
CONNECTION_ADDRESS = None
CHESSBOARD_CONNECTION_PROCESS = None
USB_READER = None
LED_MANAGER = None
VIRTUAL_BOARD = None
PHYSICAL_BORAD_FEN = None

def waitFor(seconds):
    time.sleep(seconds)

def stateConnecting(state):
    print("stateConnecting")
    assert(state == State.Connecting)

    CHESSBOARD_CONNECTION_PROCESS = usbtool.start_usbtool(
        CONNECTION_ADDRESS, separate_process=True
    )

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
    assert(state == State.Calibrating)

    while not USB_READER.calibration(True):
        print("Trying to calibrate")

    return State.NewGame

def stateNewGame(state):
    print("stateNewGame")
    assert(state == State.NewGame)

    LED_MANAGER.set_leds("corners")

    current_fen = USB_READER.read_board()

    VIRTUAL_BOARD = chess.Board()

    while VIRTUAL_BOARD.board_fen() != current_fen:
        current_fen = USB_READER.read_board(update=True)

    LED_MANAGER.set_leds("")

    PHYSICAL_BORAD_FEN = current_fen

    return State.WaitingForInput

def stateWaitingForInput(state):
    print("stateWaitingForInput")
    assert(state == State.WaitingForInput)

    # It's checkmate or a repetition
    if VIRTUAL_BOARD.is_game_over():
        LED_MANAGER.set_leds("center")
        return state.EndOfGame
    
    moves = get_moves(
        VIRTUAL_BOARD, PHYSICAL_BOARD_FEN, check_double_moves=True
    )

    while not moves:
        # there a a big problem...
        highligted_leds = (
            LED_MANAGER.highlight_misplaced_pieces(
                PHYSICAL_BORAD_FEN,
                VIRTUAL_BOARD,
                False
            )
        )
        PHYSICAL_BORAD_FEN = USB_READER.read_board(update=True)
        moves = get_moves(
            VIRTUAL_BOARD, PHYSICAL_BOARD_FEN, check_double_moves=True
        )

    for move in moves:
        VIRTUAL_BOARD.push_uci(move)
        # This is where we update the bluetooth component
        # BLUETOOTH_QUEUE.put(move)

    PHYSICAL_BOARD_FEN = USB_READER.read_board(update=True)

    return state.WaitingForInput

if __name__ == "__main__":
    multiprocessing.freeze_support()

    s = State.Connecting

    while s != State.EndOfGame:
        if s == State.Connecting:
            s = stateConnecting(s)
        elif s == State.Calibrating:
            s = stateCalibrating(s)
        elif s == State.NewGame:
            s = stateNewGame(s)
        elif s == State.WaitingForInput:
            s = stateWaitingForInput(s)
