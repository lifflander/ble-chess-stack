
import React, { useState, useEffect } from 'react';
import { Form, useLoaderData, useParams } from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import axios from 'axios'
import { Chessboard } from 'react-chessboard'
import { Chess, Move } from "chess.js";
import { Square } from 'react-chessboard/dist/chessboard/types';

const client = axios.create({
    baseURL: "http://localhost:5000/"
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

    let { gameID } = useParams();

    console.log("running Game()")

    useEffect(() => {
        if (gameID !== undefined) {
            getGame(+gameID)
        }
    }, [])

    const getGame = async (id : number) => {
        await client.get('games/' + id).then(json => {
            setGame(json.data)
            const x = json.data as Game
            updateDisplayedMoves(x, curMove)
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

    const getSelectedMoveClass = (moveid : number) : string => {
        return moveid === curMove ? "moveSelected" : "move"
    }

    const updateMove = (index : number) => {
        setCurMove(index)
        updateDisplayedMoves(game!, index)
    }

    const getRealPGN = (moves : GameMove[], index : number) : string => {
        const s : Chess = new Chess()
        moves.map((move) => {
            if (move.moveIndex < index) {
                s.move({
                    from: move.pgn.substring(0, 2) as Square,
                    to: move.pgn.substring(2, 4) as Square,
                    promotion: "q"
                })
            }
        })
        const history : Move[] = s.history({verbose: true})
        return history[history.length-1].san
    }

    const renderMoves = () => {
        return game?.moves.map((move : GameMove, index : number) => {
            const moveIndex = move.moveIndex + 1
            return (
                <span className="moveSpan">
                    {(moveIndex-1) % 2 == 0 ? ((moveIndex + 1) / 2).toString() + ". " : ""}
                    <a
                        className={getSelectedMoveClass(moveIndex)}
                        onClick={() => updateMove(moveIndex)}
                    >{getRealPGN(game?.moves, moveIndex)}
                    </a>
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

    return (
        <div className="Game">
            <header className="App-header">
              GameID: {game?.id}<br/> Title: {game?.title}
              <div>
              {renderMoves()}
              </div>
            <div className='chess-board'>
            <Chessboard position={chessState.fen()} onPieceDrop={onDrop} />
            </div>
            </header>
        </div>
    );
}

export default Game;
