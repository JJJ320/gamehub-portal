import { collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
export type LeaderboardEntry={userId:string;displayName:string;avatarUrl:string|null;gamesPlayed:number;playTimeMs:number;points:number};
export async function updateLeaderboard(userId:string,additionalMs:number,countedAsNewPlayer:boolean){
 const ms=Math.max(0,Math.round(additionalMs)),ref=doc(db,"leaderboard",userId),profileRef=doc(db,"profiles",userId);
 await runTransaction(db,async t=>{const l=await t.get(ref),p=await t.get(profileRef),c=l.exists()?l.data():{},pd=p.exists()?p.data():{};
 const playTimeMs=(typeof c.playTimeMs==="number"?c.playTimeMs:0)+ms,gamesPlayed=(typeof c.gamesPlayed==="number"?c.gamesPlayed:0)+(countedAsNewPlayer?1:0);
 t.set(ref,{userId,displayName:typeof pd.display_name==="string"&&pd.display_name.trim()?pd.display_name.trim():"Jogador",avatarUrl:typeof pd.avatar_url==="string"?pd.avatar_url:null,gamesPlayed,playTimeMs,points:gamesPlayed*100+Math.floor(playTimeMs/60000),updatedAt:serverTimestamp()},{merge:true});});
}
export async function listLeaderboard(limitCount=50):Promise<LeaderboardEntry[]>{
 const s=await getDocs(query(collection(db,"leaderboard"),orderBy("points","desc")));
 return s.docs.slice(0,Math.max(1,limitCount)).map(i=>{const d=i.data();return{userId:i.id,displayName:typeof d.displayName==="string"&&d.displayName.trim()?d.displayName:"Jogador",avatarUrl:typeof d.avatarUrl==="string"?d.avatarUrl:null,gamesPlayed:typeof d.gamesPlayed==="number"?Math.max(0,d.gamesPlayed):0,playTimeMs:typeof d.playTimeMs==="number"?Math.max(0,d.playTimeMs):0,points:typeof d.points==="number"?Math.max(0,d.points):0};});
}