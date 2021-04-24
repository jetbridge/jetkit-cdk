import { Column, ManyToOne, ManyToMany, Entity } from "typeorm";
import { DeveloperStudio } from "./developerStudio";
import { Genre } from "./genre";
import { BaseModel } from "@jetkit/cdk";
import { GameReception } from "./constant";

@Entity()
export class Game extends BaseModel {
  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true, type: "timestamptz" })
  releaseDate: Date;

  @ManyToOne(() => DeveloperStudio, (developerStudio) => developerStudio.games)
  developerStudio: DeveloperStudio;

  @ManyToMany(() => Genre, (genre) => genre.games)
  genres: Genre[];

  @Column({
    type: "enum",
    enum: GameReception,
    nullable: true,
  })
  reception: GameReception;
}
