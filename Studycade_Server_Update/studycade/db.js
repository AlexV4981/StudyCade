'use strict';
const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');
function openDb(filename,adminEmail,seed){
  fs.mkdirSync(path.dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(`CREATE TABLE IF NOT EXISTS users(email TEXT PRIMARY KEY,role TEXT NOT NULL CHECK(role IN ('viewer','editor','admin')),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS sets(id TEXT PRIMARY KEY,title TEXT NOT NULL,owner_email TEXT,visibility TEXT NOT NULL CHECK(visibility IN ('shared','private')),source TEXT NOT NULL,builtin INTEGER NOT NULL DEFAULT 0 CHECK(builtin IN (0,1)),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(owner_email) REFERENCES users(email));
  CREATE TABLE IF NOT EXISTS cards(id INTEGER PRIMARY KEY AUTOINCREMENT,set_id TEXT NOT NULL,term TEXT NOT NULL,definition TEXT NOT NULL,position INTEGER NOT NULL,FOREIGN KEY(set_id) REFERENCES sets(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS progress(email TEXT NOT NULL,set_id TEXT NOT NULL,right_count INTEGER NOT NULL DEFAULT 0,wrong_count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(email,set_id),FOREIGN KEY(email) REFERENCES users(email),FOREIGN KEY(set_id) REFERENCES sets(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_email TEXT NOT NULL,target_email TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE INDEX IF NOT EXISTS idx_cards_set_position ON cards(set_id,position);
  CREATE INDEX IF NOT EXISTS idx_sets_visibility_title ON sets(visibility,title COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_sets_owner ON sets(owner_email);`);
  db.prepare("INSERT OR IGNORE INTO users(email,role) VALUES(?,'admin')").run(adminEmail);
  // The configured initial administrator stays an administrator after restart.
  db.prepare("UPDATE users SET role='admin',active=1 WHERE email=?").run(adminEmail);
  const insertSet=db.prepare("INSERT INTO sets(id,title,owner_email,visibility,source,builtin) VALUES(?,?,NULL,'shared',?,1)");
  const insertCard=db.prepare('INSERT INTO cards(set_id,term,definition,position) VALUES(?,?,?,?)');
  for(const s of seed){if(db.prepare('SELECT id FROM sets WHERE id=?').get(s.id))continue;db.exec('BEGIN IMMEDIATE');try{insertSet.run(s.id,s.title,s.source);s.cards.forEach((c,i)=>insertCard.run(s.id,c.term,c.definition,i));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
  return db;
}
function createSet(db,{title,visibility,source,owner,cards}){
  const id=randomUUID();db.exec('BEGIN IMMEDIATE');try{
    if(db.prepare('SELECT COUNT(*) AS total FROM sets').get().total>=1000)throw Object.assign(Error('This installation has reached its 1,000-set limit.'),{status:409});
    db.prepare('INSERT INTO sets(id,title,owner_email,visibility,source,builtin) VALUES(?,?,?,?,?,0)').run(id,title,owner,visibility,source);const stmt=db.prepare('INSERT INTO cards(set_id,term,definition,position) VALUES(?,?,?,?)');cards.forEach((c,i)=>stmt.run(id,c.term,c.definition,i));db.exec('COMMIT');return id;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
function updateSet(db,id,{title,visibility,cards}){
  db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE sets SET title=?,visibility=? WHERE id=?').run(title,visibility,id);db.prepare('DELETE FROM cards WHERE set_id=?').run(id);const stmt=db.prepare('INSERT INTO cards(set_id,term,definition,position) VALUES(?,?,?,?)');cards.forEach((c,i)=>stmt.run(id,c.term,c.definition,i));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
module.exports={openDb,createSet,updateSet};
