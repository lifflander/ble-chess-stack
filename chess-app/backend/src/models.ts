
import { Table, Model, Column, DataType } from "sequelize-typescript";

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
}
