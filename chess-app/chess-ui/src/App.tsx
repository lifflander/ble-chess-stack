
import React, { useState, useEffect} from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios'

const client = axios.create({
    baseURL: "http://localhost:5000/games" 
});

function App() {

    const [message, setMessage] = useState("");

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
	} catch (error) {
	    console.log(error);
	}
    };
    
    return (
	<div className="App">
	    <header className="App-header">
              <img src={logo} className="App-logo" alt="logo" />
              <p>
              Edit <code>src/App.tsx</code> and save to reload. OK. {message}
              </p>
	      <div className="add-game-container">
	        <form onSubmit={handleSubmit}>
	           <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
	           <button type="submit">Add Game</button>
	        </form>
	      </div>
	    </header>
	</div>
    );
}

export default App;
