
import { Table, Model, Column, DataType, HasMany, ForeignKey, BelongsTo } from "sequelize-typescript";

import { ChessGame } from './game'

@Table({
    timestamps: true,
    tableName: "moves",
})
export class ChessMove extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare pgn: string;

    @ForeignKey(() => ChessGame)
    @Column
    declare gameID: number;

    @Column
    declare moveIndex: number;

    @BelongsTo(() => ChessGame)
    declare game: ChessGame;
}

