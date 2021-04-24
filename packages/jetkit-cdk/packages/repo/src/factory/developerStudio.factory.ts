import { Factory } from "fishery"
import faker from 'faker/locale/en_US'
import { DeveloperStudio } from "../model/developerStudio"



export const developerStudioFactory: Factory<DeveloperStudio> = Factory.define<any>(() => ({
    name: faker.lorem.word(),
}))

