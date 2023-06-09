
import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios'

const client = axios.create({
    baseURL: "http://localhost:5000/games" 
});

interface Game {
  id: number;
  title: string;
};

function App() {

    const [message, setMessage] = useState("");
    const [games, setGames] = useState<Game[]>([])

    useEffect(() => {
        fetch("http://localhost:5000/test/")
            .then((res) => res.json())
            .then((data) => setMessage(data.message));
    }, []);

    const [title, setTitle] = useState('');
    // const [body, setBody] = useState('');
    // const [posts, setPosts] = useState([]);

    const handleSubmit = (e : React.FormEvent<HTMLFormElement> ) => {
        console.log("called submit");
        e.preventDefault();
        addGame(title);
    };

    const addGame = async (title : String) => {
        try {
            console.log("adding game");
            let response = await client.post('', {
                title: title
            });
            console.log(response)
            getGames()
        } catch (error) {
            console.log(error);
        }
    };

    const getGames = () => {
        client.get('').then(json => setGames(json.data))
    }

    useEffect(() => {
        getGames()
    }, [])

    const renderTable = () => {
        return games.map(game => {
            return (
                <tr>
                    <td>{game.id}</td>
                    <td>{game.title}</td>
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
              <table id="games">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>{renderTable()}</tbody>
              </table>
            </header>
        </div>
    );
}

export default App;

