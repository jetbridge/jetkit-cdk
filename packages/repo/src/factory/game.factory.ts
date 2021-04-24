import faker from "faker/locale/en_US";
import { Factory } from "fishery";
import { Game } from "../model/game";
import { developerStudioFactory } from "./developerStudio.factory";
import { genreFactory } from "./genre.factory";

export const gameFactory: Factory<Game> = Factory.define<any>(() => ({
  name: faker.lorem.word(),
  reception: faker.random.arrayElement(["positive", "negative", "mixed"]),
  developerStudio: developerStudioFactory.build(),
  genres: genreFactory.buildList(3),
}));
