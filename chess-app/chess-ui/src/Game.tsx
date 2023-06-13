
import React, { useState, useEffect } from 'react';
import { Form, useLoaderData, useParams } from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import axios from 'axios'
import { Chessboard } from 'react-chessboard'
import { Chess } from "chess.js";
import { Square } from 'react-chessboard/dist/chessboard/types';

const client = axios.create({
    baseURL: "http://localhost:5000/"
});

interface Move {
    id: number
    pgn: string
    gameID : number
}

interface Game {
    id: number
    title: string
    moves: Move[]
};

interface StateMove {
    from: Square
    to: Square
    promotion: string
}

function Game() {
    const [game, setGame] = useState<Game>()
    const [chessState, setChessState] = useState<Chess>(new Chess());

    let { gameID } = useParams();

    console.log("running Game()")

    useEffect(() => {
        if (gameID !== undefined) {
            getGame(+gameID)
            console.log("running useEffect", gameID)
        }
    }, [])

    const getGame = async (id : number) => {
        await client.get('games/' + id).then(json => {
            setGame(json.data)
            const x = json.data as Game
            const s : Chess = new Chess()
            console.log(x.moves)
            x.moves.map((move) => {
                s.move({
                    from: move.pgn.substring(0, 2) as Square,
                    to: move.pgn.substring(2, 4) as Square,
                    promotion: "q"
                })
            })
            //console.log(s.fen())
            setChessState(s)
        })
    }

    const renderMoves = () => {
        return game?.moves.map((move : Move, index : number) => {
            return (
                <tr>
                    <td scope="row">{move.id}</td>
                    <td scope="row">{move.pgn}</td>
                </tr>
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
              <table id="games" className="table Table-color">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Move</th>
                </tr>
              </thead>
              <tbody>{renderMoves()}</tbody>
              </table>
            </div>
            <div className='chess-board'>
            <Chessboard position={chessState.fen()} onPieceDrop={onDrop} />
            </div>
            </header>
        </div>
    );
}

export default Game;
