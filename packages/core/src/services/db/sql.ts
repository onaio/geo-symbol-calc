import Database from "better-sqlite3";
import { PriorityLevel } from "../../helpers/types";

export const facilityTable = `
CREATE TABLE IF NOT EXISTS facility (
    id INTEGER PRIMARY KEY NOT NULL,
    priority TEXT CHECK ${Object.values(PriorityLevel)},
    lastEvaluated INTEGER
)
`

export function prepareFacilityInsert(db: Database){
    const insert = db.prepare('INSERT INTO facility (id, priority, lastEvaluated) VALUES (?, ?)');
    return insert;
}

export function prepareReadSingleFacility(db, facilityId: number){
    const select = db.prepare('SELECT * FROM facility WHERE id = ?');
    const facility = select.get(1);
    return facility
}