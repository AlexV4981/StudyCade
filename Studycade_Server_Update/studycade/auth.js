'use strict';
const {createPublicKey,verify} = require('node:crypto');

function authConfig(env){
  const team=(env.CF_ACCESS_TEAM_DOMAIN||'').replace(/\/$/,'');
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team))throw new Error('Set CF_ACCESS_TEAM_DOMAIN to your https://<team>.cloudflareaccess.com URL');
  if(!env.CF_ACCESS_AUD || !/^[A-Za-z0-9_-]+$/.test(env.CF_ACCESS_AUD))throw new Error('Set CF_ACCESS_AUD to your Access application audience tag');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.INITIAL_ADMIN_EMAIL||''))throw new Error('Set INITIAL_ADMIN_EMAIL to your approved Access email');
  let origin;try{origin=new URL(env.PUBLIC_ORIGIN);}catch{throw new Error('Set PUBLIC_ORIGIN to the HTTPS app hostname');}
  if(origin.protocol!=='https:'||origin.origin!==env.PUBLIC_ORIGIN||origin.username||origin.password||origin.hostname.endsWith('.cloudflareaccess.com'))throw new Error('Set PUBLIC_ORIGIN to the exact HTTPS app hostname (no path or trailing slash)');
  return {team,aud:env.CF_ACCESS_AUD,admin:env.INITIAL_ADMIN_EMAIL.toLowerCase(),origin:env.PUBLIC_ORIGIN};
}
function b64url(segment){return Buffer.from(segment,'base64url');}
function createVerifier(config,{getJwks}={}){
  const certUrl=config.team+'/cdn-cgi/access/certs';let cached=null,until=0,ongoing=null;
  async function keys(force=false){
    if(getJwks)return getJwks(force);
    if(!force && cached && Date.now()<until)return cached;
    if(ongoing)return ongoing;
    ongoing=(async()=>{const res=await fetch(certUrl,{signal:AbortSignal.timeout(5000)});if(!res.ok)throw new Error('Access certificates unavailable');const body=await res.json();if(!Array.isArray(body.keys))throw new Error('Invalid Access certificate response');cached=body.keys;until=Date.now()+300000;return cached;})();
    try{return await ongoing;}finally{ongoing=null;}
  }
  return async function verifyJwt(token){
    if(typeof token!=='string'||token.length>16000)throw new Error('Missing Access token');
    const parts=token.split('.');if(parts.length!==3)throw new Error('Invalid token');
    let h,p;try{h=JSON.parse(b64url(parts[0]));p=JSON.parse(b64url(parts[1]));}catch{throw new Error('Invalid token');}
    if(h.alg!=='RS256'||typeof h.kid!=='string'||!h.kid)throw new Error('Invalid token algorithm');
    let jwks=await keys();let jwk=jwks.find(k=>k.kid===h.kid&&k.kty==='RSA');
    if(!jwk){jwks=await keys(true);jwk=jwks.find(k=>k.kid===h.kid&&k.kty==='RSA');}
    if(!jwk)throw new Error('Unknown Access key');
    let valid=false;try{valid=verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:jwk,format:'jwk'}),b64url(parts[2]));}catch{throw new Error('Invalid token signature');}
    if(!valid)throw new Error('Invalid token signature');
    const now=Math.floor(Date.now()/1000);
    if(p.iss!==config.team||!(p.aud===config.aud||(Array.isArray(p.aud)&&p.aud.includes(config.aud)))||!Number.isFinite(p.exp)||p.exp<=now||typeof p.iat!=='number'||p.iat>now+60||(p.nbf!==undefined&&p.nbf>now+60))throw new Error('Invalid Access claims');
    if(typeof p.email!=='string'||!/^([^\s@]+)@([^\s@]+)$/.test(p.email))throw new Error('Access identity has no email');
    return p.email.toLowerCase();
  };
}
module.exports={authConfig,createVerifier};
