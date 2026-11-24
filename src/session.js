let identity=null;
export const currentIdentity=()=>identity;
export function setIdentity(value){identity=value;}
export function csrfHeaders(){return identity?.csrf?{'X-CSRF-Token':identity.csrf}:{};}

export function granted(key){return identity?.permissions?.includes(key)&&identity.permissions.includes(key.split(':')[0]+':view');}
