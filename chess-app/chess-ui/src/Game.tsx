
import React, { useState, useEffect } from 'react';
import { Form, useLoaderData, useParams } from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import axios from 'axios'
import { Chessboard } from 'react-chessboard'
import { Chess, Move } from "chess.js";
import { BoardOrientation, Square } from 'react-chessboard/dist/chessboard/types';
import { ChessBoard } from 'chessboardjs';

const client = axios.create({
    baseURL: "https://liff.us-west-2.elasticbeanstalk.com/"
});

interface GameMove {
    id: number
    pgn: string
    gameID : number
    moveIndex : number
    createdAt : string
}

interface Game {
    id: number
    title: string
    moves: GameMove[]
    whiteName: string
    blackName: string
    minutes: number
    bonus: number
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
    const [orientation, setOrientation] = useState<boolean>();
    const [whiteName, setWhiteName] = useState<string>();
    const [blackName, setBlackName] = useState<string>();
    const [mins, setMins] = useState<number>();
    const [bonus, setBonus] = useState<number>();
    const [whiteTimes, setWhiteTimes] = useState<number[]>();
    const [blackTimes, setBlackTimes] = useState<number[]>();
    const [whiteTimesSum, setWhiteTimesSum] = useState<number[]>();
    const [blackTimesSum, setBlackTimesSum] = useState<number[]>();

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
            setCurMove(fetched_game.moves.length)
            setTimes(fetched_game)
            console.log("WT:", whiteTimes)
        })
    }

    const getTimeString = (duration : number) => {
        let milliseconds = Math.floor((duration % 1000) / 100),
            seconds = Math.floor((duration / 1000) % 60),
            minutes = Math.floor((duration / (1000 * 60)) % 60),
            hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
        return (hours != 0 ? hours + ":" : "") + (minutes != 0 ? minutes + ":" : "") + seconds + "." + milliseconds
    }

    const setTimes = (g : Game) => {
        if (g.moves.length < 3) {
            return
        }

        var whiteCreate : number[] = []
        var blackCreate : number[] = []
        var whiteOffset : number[] = []
        var blackOffset : number[] = []

        for (let i = 0; i < g.moves.length; i++) {
            let j = i / 2 | 0
            if (i % 2 == 0) {
                whiteCreate[j] = Date.parse(g.moves[i].createdAt)
            } else {
                blackCreate[j] = Date.parse(g.moves[i].createdAt)
            }
        }

        for (let i = 0; i < whiteCreate.length; i++) {
            if (i == 0) {
                whiteOffset[0] = 0
            } else {
                whiteOffset[i] = whiteCreate[i] - blackCreate[i-1]
            }
        }

        for (let i = 0; i < blackCreate.length; i++) {
            if (i == 0) {
                blackOffset[0] = 0
            } else {
                blackOffset[i] = blackCreate[i] - whiteCreate[i-1]
            }
        }

        console.log("white: ", whiteCreate, whiteOffset.map((x) => getTimeString(x)))
        console.log("black: ", blackCreate, blackOffset.map((x) => getTimeString(x)))

        setWhiteTimes(whiteOffset)
        setBlackTimes(blackOffset)

        // prefix sum on times to get time expended
        let whiteTimesSumLocal : number[] = []
        let blackTimesSumLocal : number[] = []

        whiteTimesSumLocal[0] = whiteOffset[0]
        blackTimesSumLocal[0] = whiteOffset[0]
        for (let i = 1; i < whiteOffset.length; i++) {
            whiteTimesSumLocal[i] = whiteTimesSumLocal[i-1] + whiteOffset[i]
        }
        for (let i = 1; i < blackOffset.length; i++) {
            blackTimesSumLocal[i] = blackTimesSumLocal[i-1] + blackOffset[i]
        }

        setWhiteTimesSum(whiteTimesSumLocal)
        setBlackTimesSum(blackTimesSumLocal)
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

    const prevMove = (cm : number) => {
        if (cm-1 > 0) {
            setCurMove(cm-1)
            updateMove(cm-1)
        }
    }

    const nextMove = (cm : number) => {
        if (cm+1 <= game!.moves.length) {
            setCurMove(cm+1)
            updateMove(cm+1)
        }
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

    const getOrient = () => {
        return (orientation ? "black" : "white") as BoardOrientation
    }

    const switchOrientation = (o : boolean) => {
        setOrientation(!o)
    }

    const getPlayerTop = (o : boolean) => {
        return getPlayerName(o)
    }

    const getPlayerBottom = (o : boolean) => {
        return getPlayerName(!o)
    }

    const getTimeTop = (o : boolean, m : number, whiteTimesSumLocal : number[], blackTimesSumLocal : number[])  => {
        return getTime(o, m, whiteTimesSumLocal, blackTimesSumLocal)
    }

    const getTimeBottom = (o : boolean, m : number, whiteTimesSumLocal : number[], blackTimesSumLocal : number[])  => {
        return getTime(!o, m, whiteTimesSumLocal, blackTimesSumLocal)
    }

    const submitWhiteName = async (e : React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const update = { whiteName: whiteName }
        await client.put('games/' + game!.id, update).then(json => {
            console.log(json)
        })
    }

    const submitBlackName = async (e : React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const update = { blackName: blackName }
        await client.put('games/' + game!.id, update).then(json => {
            console.log(json)
        })
    }

    const submitTimeControl = async (e : React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const update = { minutes: mins, bonus: bonus }
        await client.put('games/' + game!.id, update).then(json => {
            console.log(json)
        })
    }

    const getTime = (color : boolean, m : number, whiteTimesSumLocal : number[], blackTimesSumLocal : number[]) => {
        if (!m) return "Time"
        //console.log("move=", m, "wt=", whiteTimesSumLocal)
        m = m - 1
        if (color) {
            if (m % 2 != 0) {
                m = m - 1
            }
            return getTimeString(whiteTimesSumLocal[m / 2])
        } else {
            if (m % 2 == 0) {
                m = m - 1
            }
            return getTimeString(blackTimesSumLocal[m / 2 | 0])
        }
    }

    const getPlayerName = (color : boolean) => {
        if (color) {
            if (game?.whiteName) {
                return (<span>{game?.whiteName}</span>);
            } else {
                return (
                   <form onSubmit={submitWhiteName} className="submit-name">
                   <input type="text" className="form-control" value={whiteName} onChange={(e) => setWhiteName(e.target.value)} />
                   <button className='btn btn-secondary' type="submit">Update</button>
                   </form>
                )
            }
        } else {
            if (game?.blackName) {
                return (<span>{game?.blackName}</span>);
            } else {
                return (
                    <form onSubmit={submitBlackName} className="submit-name">
                    <input type="text" className="form-control" value={blackName} onChange={(e) => setBlackName(e.target.value)} />
                    <button className='btn btn-secondary' type="submit">Update</button>
                    </form>
                 )
            }
        }
    }

    const getTimeControl = () => {
        if (game?.minutes) {
            return (<span>{game?.minutes + "+" + game?.bonus}</span>)
        } else {
            return (
                <form onSubmit={submitTimeControl} className="submit-name">
                <input type="text" className="form-control" value={mins} onChange={(e) => setMins(+e.target.value)} />+
                <input type="text" className="form-control" value={bonus} onChange={(e) => setBonus(+e.target.value)} />
                <button className='btn btn-secondary' type="submit">Update</button>
                </form>
             )
        }
    }

    return (
        <div className="Game">
            <header>
              <div className='container'>
                <div className="row">
                <div className="col-12">
                <span className="span"> ID: {game?.id} </span>
                <span className="span"> Moves: {game?.moves.length} </span>
                <span className="span"> Name: {game?.title} </span>
                <span className="span"> TC: {getTimeControl()} </span>
                </div>
                </div>

                <div className="top-row row">
                <div className="col">
                <h4>{getPlayerTop(orientation!)}</h4>
                </div>
                <div className="col text-end">
                <h4>{getTimeTop(orientation!, curMove!, whiteTimesSum!, blackTimesSum!)}</h4>
                </div>
                </div>

                <div className="row">
                <div className="col">
                <div className="chess-board">
                <Chessboard boardOrientation={orientation! ? "black" : "white"} position={chessState.fen()} onPieceDrop={onDrop} />
                </div>
                </div>
                </div>

                <div className="bottom-row row">
                <div className="col">
                <h4>{getPlayerBottom(orientation!)}</h4>
                </div>
                <div className="col text-end">
                <h4>{getTimeBottom(orientation!, curMove!, whiteTimesSum!, blackTimesSum!)}</h4>
                </div>
                </div>

                <div className="row">
                <div className="col-12">
                <div className="moves">
                <button className="btn btn-secondary prev-button" onClick={() => prevMove(curMove!)}>Prev</button>
                <button className="btn btn-secondary next-button" onClick={() => nextMove(curMove!)}>Next</button>
                {renderMoves()}
                </div>
                </div>
                </div>

                <div className="row">
                <div className="col-12">
                <button className="btn btn-secondary" onClick={() => switchOrientation(orientation!)}>Swap orientation</button>
                </div>
                </div>
            </div>
            </header>
        </div>
    );
}

export default Game;
