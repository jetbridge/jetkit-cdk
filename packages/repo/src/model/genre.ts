import { Column, ManyToMany, JoinTable, Entity } from "typeorm";
import { BaseModel } from "@jetkit/cdk";
import { Game } from "./game";

@Entity()
export class Genre extends BaseModel {
  @Column({ nullable: true })
  name: string;

  @ManyToMany(() => Game, (game) => game.genres)
  @JoinTable({ name: "game_genre" })
  games: Game[];
}
