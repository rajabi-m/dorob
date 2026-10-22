export const persianNumber=(n:number)=>n.toLocaleString('fa-IR');
export const courseDuration=(minutes:number|null)=>minutes === null ? 'مدت ثبت نشده' : `${persianNumber(Math.round(minutes))} دقیقه`;
export const sourceDate=(date:string)=>new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tehran' }).format(new Date(date));
