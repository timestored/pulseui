import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Number, String, Array, Record, Static, Boolean, Partial, Undefined } from 'runtypes';
import { HTMLTable, Icon, NonIdealState } from '@blueprintjs/core';
import { SERVER } from '../engine/queryEngine';
import { fromEpoch, prettyDate } from './DashPage';
import { isAdmin, ThemeContext } from '../context';
import { ANAME } from '../App';

/** Messy conversion similar to DashPage to deal with Date/number difference between java/react and to allow checking returned json */
export const UserRecord = Record({
    id: Number,
    name: String,
    dateCreated: Number,
    dateUpdated: Number,
    admin:Boolean,
    deleted:Boolean,
}).And(Partial({
    email: String.Or(Undefined),
    password:String.Or(Undefined)
}));
export type UserR = Static<typeof UserRecord>;
export type User = {
    id: number,
    name: string,
    email: string | undefined,
    dateCreated: Date,
    dateUpdated: Date,
    admin:boolean,
    deleted:boolean,
    password:string | undefined,
}

export function convertUser(u: UserR): User {
    let dateCreated = fromEpoch(u.dateCreated as unknown as number);
    let dateUpdated = fromEpoch(u.dateUpdated as unknown as number);
    let email = u.email && u.email.length>0 ? u.email : undefined;
    let password = u.password && u.password.length>0 ? u.password : undefined;
    return { ...u, ...{ dateCreated, dateUpdated, email, password } };
}

// function convertToUserR(d: User): UserR {
//     let dateCreated = toEpoch(d.dateCreated);
//     let dateUpdated = toEpoch(d.dateUpdated);
//     return { ...d, ...{ dateCreated, dateUpdated } };
// }

async function getUsers() {
    const r = await axios.get<UserR[]>(SERVER + "/user");
    Array(UserRecord).check(r.data);
    return (r.data as unknown as UserR[]).map(d => convertUser(d));
};

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const context = useContext(ThemeContext);
    useEffect(() => { getUsers().then(u => setUsers(u))},[]);
    useEffect(() => { document.title = ANAME + " - Users" }, []);

    if(!isAdmin(context)) {
        return <NonIdealState icon="error" title="You are not permitted on this page." ></NonIdealState>;
    }

    return (<><h1>Users</h1>
            <div><HTMLTable condensed striped bordered>
            <thead><tr><th>Name</th><th>Email</th><th>Admin</th><th>Updated</th><th>Created</th></tr></thead>
                <tbody>{users.map((u, idx) => <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.admin && <span><Icon icon="user" intent="danger" />Admin</span>}</td>
                    <td>{prettyDate(u.dateUpdated)}</td>
                    <td>{prettyDate(u.dateCreated)}</td>
                    {/* <td>{idx !== 0 && <Button small intent="primary" onClick={() => confirmRestore({...s, version:maxVersion})}>Restore</Button>}</td></tr>)}</tbody> */}
                    </tr>)}
            </tbody></HTMLTable></div>
        </>);
}