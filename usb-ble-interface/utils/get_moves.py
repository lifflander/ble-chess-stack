# from lru import LRU

# get_moves_cache = LRU(8)

import chess.pgn

def transposeCodes(codes):
    transposed_codes = []
    for row in reversed(range(8)):
        for col in range(8):
            transposed_codes.append(codes[row * 8 + col])
    return transposed_codes

def get_moves(virtual_board, physical_fen, previous_codes, new_codes, check_double_moves=False):
    # virtual_fen = virtual_board.board_fen()
    # caching_key = (virtual_fen, physical_fen, check_double_moves)
    # try:
    #     return get_moves_cache[caching_key]
    # except KeyError:
    #     pass

    def only_allow_changed(squares):
        # print(squares)
        for i in range(len(previous_codes)):
            if i in squares:
                pass
            else:
                if previous_codes[i] != new_codes[i]:
                    print("i: ", i, ", prev=" , previous_codes[i], "cur: ", new_codes[i])
                    print("prev: ", previous_codes)
                    print("new : ", new_codes)
                    return False
        return True

    def king_move(board, square):
        return board.piece_type_at(square) == chess.KING

    copy_board = virtual_board.copy(stack=False)
    for move in copy_board.generate_legal_moves():
        is_enpassant = copy_board.is_en_passant(move)
        copy_board.push(move)
        if physical_fen == copy_board.board_fen():
            if is_enpassant or king_move(copy_board, move.to_square):
                return [move.uci()]
            else:
                if only_allow_changed([move.from_square, move.to_square]):
                    return [move.uci()]
                else:
                    return []

        copy_board.pop()

    if check_double_moves:
        for move in copy_board.generate_legal_moves():
            copy_board.push(move)
            move1_king = king_move(copy_board, move.to_square)
            move1_enpassant = copy_board.is_en_passant(move)
            for move2 in copy_board.generate_legal_moves():
                move2_enpassant = copy_board.is_en_passant(move2)
                copy_board.push(move2)
                if physical_fen == copy_board.board_fen():
                    if move1_king or move1_enpassant or move2_enpassant or king_move(copy_board, move2.to_square):
                        return [move.uci(), move2.uci()]
                    else:
                        if only_allow_changed([move.from_square, move.to_square, move2.from_square, move2.to_square]):
                            return [move.uci(), move2.uci()]
                        else:
                            return []
                copy_board.pop()
            copy_board.pop()

    result = []
    # get_moves_cache[caching_key] = result
    return result


# TODO: Allow double move back for human games
# is_move_back_cache = LRU(8)


# def is_move_back(virtual_board, physical_fen):
#     """
#     Check if physical fen correspondts to virtual_board with a move back
#     :param virtual_board:
#     :param physical_fen:
#     :return:
#     """
#     virtual_fen = virtual_board.board_fen()
#     caching_key = (virtual_fen, physical_fen)
#     try:
#         return is_move_back_cache[caching_key]
#     except KeyError:
#         pass

#     temp_board = virtual_board.copy()
#     result = False
#     try:
#         temp_board.pop()
#     except IndexError:
#         pass
#     else:  # No exception
#         if temp_board.board_fen() == physical_fen:
#             result = True

#     is_move_back_cache[caching_key] = result
#     return result
