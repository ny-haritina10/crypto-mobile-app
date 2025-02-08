import firestore, { Timestamp } from '@react-native-firebase/firestore';

export default function dateToPostgresTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  let milliseconds;
  
  if (date.getMilliseconds()) {
    milliseconds = '.' + String(date.getMilliseconds());
    // Optional rounding of milliseconds for consistency with PostgreSQL's default precision
    if (milliseconds.length > 4) {
        milliseconds = '.' + Number(milliseconds.slice(1)).toFixed(3);
    }
  } else {
    milliseconds = '';
  }

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${milliseconds}`;
}


export const timestampToInt = (timestamp: Timestamp | null): number => {
    if (!timestamp) return 0;   
    return timestamp.toDate().getTime(); 
}

const convertFirestoreTimestampToPostgres = (timestamp: any): Date => {
    return timestamp?.toDate() || new Date();
};
  