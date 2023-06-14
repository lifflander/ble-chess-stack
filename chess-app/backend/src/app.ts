
import express, { Request, Response } from 'express';
import cors from 'cors';

import { Sequelize } from 'sequelize-typescript';
import { ChessGame } from "./game";
import { ChessMove } from "./move";
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
    models: [ ChessGame, ChessMove ]
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/test', (req, res) => {
    res.json({ message: "Hello2" });
});

app.get("/games", async (req: Request, res: Response): Promise<Response> => {
    await ChessGame.sync({force: false});
    await ChessMove.sync({force: false});
    console.log("get all games");
    const allgames: ChessGame[] = await ChessGame.findAll({include: [ ChessMove ]});
    return res.status(200).json(allgames);
});

app.get("/games/:id", async (req: Request, res: Response): Promise<Response> => {
    await ChessGame.sync({force: false});
    console.log(`Get request`);
    const { id } = req.params;
    console.log(id);
    const game : ChessGame | null = await ChessGame.findByPk(id, {include: [ ChessMove ]});
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

app.get("/moves", async (req: Request, res: Response): Promise<Response> => {
    await ChessMove.sync({force: false});
    console.log("get all moves");
    const allmoves: ChessMove[] = await ChessMove.findAll();
    return res.status(200).json(allmoves);
});

app.get("/moves/:gameid", async (req: Request, res: Response): Promise<Response> => {
    await ChessMove.sync({force: false});
    const { gameid } = req.params;
    console.log("get moves for game");
    const allmoves : ChessMove[] = await ChessMove.findAll({where: { gameID: gameid }})
    return res.status(200).json(allmoves);
});

app.post("/moves", bodyParser.json(), async (req: Request, res: Response): Promise<Response> => {
    console.log(req.body)
    const newmove = req.body as ChessMove;
    // return res.json(req.body);
    // await console.log(req.body)
    const allmoves : ChessMove[] = await ChessMove.findAll({where: { gameID: newmove.gameID }});
    const game: ChessMove = await ChessMove.create({ ...req.body, moveIndex: allmoves.length });
    return res.status(201).json(game);
});
