import database from 'better-sqlite3';
import { facilityTable } from './sql';

export function getDb(filePath: string){
    const db = database(filePath)
    db.exec(facilityTable)
    return db
}