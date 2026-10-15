'use strict';
const {DatabaseSync,backup}=require('node:sqlite');const {mkdirSync}=require('node:fs');const path=require('node:path');
(async()=>{
  const filename=process.env.DB_PATH||'/data/arcade.db';const directory=process.env.BACKUP_DIR||'/data/backups';mkdirSync(directory,{recursive:true});
  const target=path.join(directory,'arcade-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db');
  const db=new DatabaseSync(filename);try{await backup(db,target);console.log(target);}finally{db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
