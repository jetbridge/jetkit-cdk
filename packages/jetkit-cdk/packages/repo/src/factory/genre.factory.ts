import { Factory } from "fishery"
import faker from 'faker/locale/en_US'
import { Genre } from "../model/genre"


export const genreFactory: Factory<Genre> = Factory.define<any>(() => ({
    name: faker.lorem.word()
}))
