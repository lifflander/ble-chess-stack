
import React, { useState, useEffect } from 'react';
import { Form, useLoaderData, useParams } from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import axios from 'axios'

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

function Game() {
    const [game, setGame] = useState<Game>()

    const getGame = async (id : number) => {
        await client.get('games/' + id).then(json => setGame(json.data) )
    }

    let { gameID } = useParams();

    useEffect(() => {
        if (gameID !== undefined)
            getGame(+gameID)
    }, [])

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
            </header>
        </div>
    );
}

export default Game;
