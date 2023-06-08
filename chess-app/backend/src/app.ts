
import express, { Request, Response } from 'express';
import cors from 'cors';

import { Sequelize } from 'sequelize-typescript';
import { ChessGame } from "./models";
import bodyParser from 'body-parser'

const app = express();
const port = 5000;

app.use(cors())

// const dbc = require("../config/db.config.js");

const sequelize = new Sequelize({
    dialect: "postgres",
    host: "postgres",
    username: "postgres",
    password: "mypassword",
    database: "chessgame",
    logging: console.log,
    models: [ ChessGame]
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/test', (req, res) => {
    res.json({ message: "Hello2" });
});

app.get("/games", async (req: Request, res: Response): Promise<Response> => {
  console.log("get all games");
  const allgames: ChessGame[] = await ChessGame.findAll();
  return res.status(200).json(allgames);
});

app.get("/games/:id", async (req: Request, res: Response): Promise<Response> => {
  console.log(`Get request`);
  const { id } = req.params;
  console.log(id);
  const game : ChessGame | null = await ChessGame.findByPk(id);
  console.log(game)
  return res.status(200).json(game);
});

app.post("/games", bodyParser.json(), async (req: Request, res: Response): Promise<Response> => {
  console.log(req.body)
    // return res.json(req.body);
  // await console.log(req.body)
  const game: ChessGame = await ChessGame.create({ ...req.body });
  return res.status(201).json(game);
});

app.put("/games/:id", bodyParser.json(), async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  await ChessGame.update({ ...req.body }, { where: { id } });
  const updatedGame: ChessGame | null = await ChessGame.findByPk(id);
  return res.status(200).json(updatedGame);
});

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
