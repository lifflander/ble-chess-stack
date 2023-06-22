
import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios'
import { getServerConfig } from './config';

const serverConfig = getServerConfig()

const client = axios.create({
    baseURL: serverConfig.host
});

interface Move {
    pgn: string
    gameID : number
}

interface Game {
    id: number
    title: string
    moves: Move[]
    createdAt: Date
    whiteName: string
    blackName: string
};

function App() {

    const [message, setMessage] = useState("");
    const [games, setGames] = useState<Game[]>([])

    useEffect(() => {
        fetch(serverConfig.host + "test/")
            .then((res) => res.json())
            .then((data) => setMessage(data.message));
    }, []);

    const [title, setTitle] = useState('');

    const handleSubmit = (e : React.FormEvent<HTMLFormElement> ) => {
        console.log("called submit");
        e.preventDefault();
        addGame(title);
    };

    const addGame = async (title : String) => {
        try {
            console.log("adding game");
            let response = await client.post('games', {
                title: title
            });
            console.log(response)
            getGames()
        } catch (error) {
            console.log(error);
        }
    };

    const getGames = async () => {
        await client.get('games').then((json) => {
            var allgames = json.data as Game[]
            allgames.sort((a : Game, b : Game) => { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() })

            let nonzero = allgames.filter(g => g.moves.length != 0)
            let zero = allgames.filter(g => g.moves.length == 0)
            let nonzeroFilled = nonzero.filter(g => g.whiteName && g.whiteName !== "" && g.blackName && g.blackName !== "")
            setGames(allgames)
        })
    }

    useEffect(() => {
        getGames()
    }, [])

    const renderTableDone = () => {
        let nonzero = games.filter(g => g.moves.length != 0)
        let nonzeroFilled = nonzero.filter(g => g.whiteName && g.whiteName !== "" && g.blackName && g.blackName !== "")
        return nonzeroFilled.map((game, index : number) => {
            return (
                <tr>
                    <td>{game.id}</td>
                    <td>{game.title}</td>
                    <td>{game.moves?.length}</td>
                    <td>{game.whiteName + " vs. " + game.blackName}</td>
                    <td>{new Date(game.createdAt).toLocaleString()}</td>
                    <td>
                      <a href={"/games/" + game.id}>View</a>
                    </td>
                </tr>
            )
        })
    }

    const renderTableZero = () => {
        let zero = games.filter(g => g.moves.length == 0)
        return zero.map((game, index : number) => {
            return (
                <tr>
                    <td>{game.id}</td>
                    <td>{game.title}</td>
                    <td>{game.moves?.length}</td>
                    <td>{new Date(game.createdAt).toLocaleString()}</td>
                    <td>
                      <a href={"/games/" + game.id}>View</a>
                    </td>
                </tr>
            )
        })
    }

    const renderTableOther = () => {
        let nonzero = games.filter(g => g.moves.length != 0)
        let nonzeroUnfilled = nonzero.filter(g => !(g.whiteName && g.whiteName !== "" && g.blackName && g.blackName !== ""))
        return nonzeroUnfilled.map((game, index : number) => {
            return (
                <tr>
                    <td>{game.id}</td>
                    <td>{game.title}</td>
                    <td>{game.moves?.length}</td>
                    <td>{new Date(game.createdAt).toLocaleString()}</td>
                    <td>
                      <a href={"/games/" + game.id}>View</a>
                    </td>
                </tr>
            )
        })
    }

    return (
        <div className="App">
            <header className="App-header">
              {/* <div className="add-game-container">
                <form onSubmit={handleSubmit}>
                   <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
                   <button type="submit">Add Game</button>
                   </form>
              </div> */}
	    <div className='container game-tables'>
        <div className='row'>
        <div className='col'>
              <table id="games" className="table table-sm Table-color">
              <thead className="thead-dark">
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Moves</th>
                  <th>Name</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{renderTableDone()}</tbody>
              </table>
        </div>
        </div>
        <div className='row'>
        <div className='col'>
              <table id="games" className="table table-sm Table-color">
              <thead className="thead-dark">
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Moves</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{renderTableOther()}</tbody>
              </table>
        </div>
        </div>
        <div className='row'>
        <div className='col'>
              <table id="games" className="table table-sm Table-color">
              <thead className="thead-dark">
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Moves</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{renderTableZero()}</tbody>
              </table>
        </div>
        </div>
	    </div>
            </header>
        </div>
    );
}

export default App;

