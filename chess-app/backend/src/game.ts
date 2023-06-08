
import { Table, Model, Column, DataType, HasMany, ForeignKey, BelongsTo } from "sequelize-typescript";

import { ChessMove } from './move'

@Table({
    timestamps: true,
    tableName: "games",
})
export class ChessGame extends Model {
    @Column({
	type: DataType.STRING,
	allowNull: false,
    })
    declare title: string;

    @HasMany(() => ChessMove)
    declare moves: ChessMove[];
}
