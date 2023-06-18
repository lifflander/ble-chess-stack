
import React, { useState, useEffect } from 'react';
import { Form, useLoaderData, useParams } from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import axios from 'axios'
import { Chessboard } from 'react-chessboard'
import { Chess, Move } from "chess.js";
import { Square } from 'react-chessboard/dist/chessboard/types';

const client = axios.create({
    baseURL: "https://liff.us-west-2.elasticbeanstalk.com/"
});

interface GameMove {
    id: number
    pgn: string
    gameID : number
    moveIndex : number
}

interface Game {
    id: number
    title: string
    moves: GameMove[]
};

interface StateMove {
    from: Square
    to: Square
    promotion: string
}

function Game() {
    const [game, setGame] = useState<Game>()
    const [curMove, setCurMove] = useState<number>()
    const [chessState, setChessState] = useState<Chess>(new Chess());
    const [PGNMoves, setPGNMoves] = useState<string[]>([]);

    let { gameID } = useParams();

    console.log("running Game()")

    useEffect(() => {
        if (gameID !== undefined) {
            getGame(+gameID)
        }
    }, [])

    const getGame = async (id : number) => {
        await client.get('games/' + id).then(json => {
            const fetched_game = json.data as Game;
            setGame(fetched_game)
            updateDisplayedMoves(fetched_game, curMove)
            setPGNMoves(getPGNs(fetched_game.moves))
        })
    }

    const updateDisplayedMoves = (game : Game, moveNum : number = 100000000) => {
        if (game) {
            const s : Chess = new Chess()
            game.moves.map((move) => {
                if (move.moveIndex < moveNum) {
                    s.move({
                        from: move.pgn.substring(0, 2) as Square,
                        to: move.pgn.substring(2, 4) as Square,
                        promotion: "q"
                    })
                }
            })
            setChessState(s)
        }
    }

    const getSelectedMoveClass = (index : number, cur_move : number) : string => {
        return index === cur_move ? "moveSelected" : "move"
    }

    const updateMove = (index : number) => {
        setCurMove(index)
        updateDisplayedMoves(game!, index)
    }

    const getPGNs = (moves : GameMove[]) : string[] => {
        const s : Chess = new Chess()
        moves.map((move) => {
            s.move({
                from: move.pgn.substring(0, 2) as Square,
                to: move.pgn.substring(2, 4) as Square,
                promotion: "q"
            })
        })
        const history : Move[] = s.history({verbose: true})
        return history.map((h) => h.san);
    }

    const renderMoves = () => {
        return game?.moves.map((move : GameMove, index : number) => {
            const moveIndex = move.moveIndex + 1
            return (
                <span className="moveSpan span">
                    <span className="moveIndex">
                        {(moveIndex-1) % 2 == 0 ? ((moveIndex + 1) / 2).toString() + ". " : ""}
                    </span>
                    <span className="moveElement">
                    <a
                        className={getSelectedMoveClass(moveIndex, curMove!)}
                        onClick={() => updateMove(moveIndex)}
                    >{PGNMoves[moveIndex-1] + " "}
                    </a>
                    </span>
                </span>
            )
        })
    }

    const makeAMove = (move : StateMove) => {
        const copyOfBoard : Chess = new Chess(chessState.fen())
        const result = copyOfBoard.move(move);
        console.log("moving: ", result)
        setChessState(copyOfBoard);
        return result; // null if the move was illegal, the move object if the move was legal
    }

    const onDrop = (sourceSquare : Square, targetSquare : Square) => {
        const move = makeAMove({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q"
        });

        // illegal move
        if (move === null) return false;
        return true;
    }

    const outputCurrentState = () => {
        if (chessState.isStalemate()) {
            return "Draw -- Stalemate"
        } else if (chessState.isThreefoldRepetition()) {
            return "Draw -- 3-fold"
        } else if (chessState.isInsufficientMaterial()) {
            return "Draw -- insufficient material"
        } else if (chessState.isDraw()) {
            return "Draw"
        } else if (chessState.isCheckmate()) {
            return "Checkmate"
        }  else if (chessState.isCheck()) {
            return "Check"
        } else {
            return "Active"
        }
    }

    return (
        <div className="Game">
            <header>
              <div className='container'>
                <div className="row">
                <div className="col-12">
                <span className="span"> GameID: {game?.id} </span>
                <span className="span"> Moves {game?.moves.length} </span>
                <span className="span"> Title: {game?.title} </span>
                </div>
                </div>

                <div className="top-row row">
                <div className="col-10">
                <h4>Player 2</h4>
                </div>
                <div className="col-2">
                <h4> Time </h4>
                </div>
                </div>

                <div className="row">
                <div className="col-12">
                <Chessboard position={chessState.fen()} onPieceDrop={onDrop} />
                </div>
                </div>

                <div className="bottom-row row">
                <div className="col-10">
                <h4>Player 1</h4>
                </div>
                <div className="col-2">
                <h4> Time </h4>
                </div>
                </div>

                <div className="row">
                <div className="col-12">
                <div className="moves">
                {renderMoves()}
                </div>
                </div>
                </div>

                <div className="row">
                <div className="col-12">
            {}
                </div>
                </div>
            </div>
            </header>
        </div>
    );
}

export default Game;
