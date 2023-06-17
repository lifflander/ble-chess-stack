
import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios'
// import { useHistory } from 'react-router-dom';

const client = axios.create({
    baseURL: "http://liff.us-west-2.elasticbeanstalk.com/"
});

interface Move {
    pgn: string
    gameID : number
}

interface Game {
    id: number
    title: string
    moves: Move[]
};

function App() {

    const [message, setMessage] = useState("");
    const [games, setGames] = useState<Game[]>([])

    useEffect(() => {
        fetch("http://liff.us-west-2.elasticbeanstalk.com/test/")
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
        await client.get('games').then(json => setGames(json.data) )
    }

    useEffect(() => {
        getGames()
    }, [])

    const renderTable = () => {
        return games.map((game, index : number) => {
            //let move_str : string = game.moves?.map((move : Move) : string => move.pgn).reduce((acc  : string, cur : string) : string => acc + cur, "" as string)
            let move_len_str : string = "Moves: " + game.moves?.length
            return (
                <tr>
                    <td>{game.id}</td>
                    <td>{game.title}</td>
                    <td>{move_len_str}</td>
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
              <p>
              OK. {message}
              </p>
              <div className="add-game-container">
                <form onSubmit={handleSubmit}>
                   <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
                   <button type="submit">Add Game</button>
                </form>
              </div>
	      <div className="table-holder">
              <table id="games" className="table table-sm Table-color">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Moves</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{renderTable()}</tbody>
              </table>
	    </div>
            </header>
        </div>
    );
}

export default App;

