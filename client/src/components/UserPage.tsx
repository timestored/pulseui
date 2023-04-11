import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Number, String, Array, Record, Static, Boolean, Partial, Undefined } from 'runtypes';
import { Alert, Button, Checkbox, HTMLTable, Icon, Intent, NonIdealState } from '@blueprintjs/core';
import { SERVER } from '../engine/queryEngine';
import { fromEpoch, prettyDate } from './DashPage';
import { isAdmin, notyf, ThemeContext } from '../context';
import { analytics, ANAME } from '../App';

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
    useEffect(() => fetchProcessUsers(),[]);
    const [deleteId, setDeleteId] = useState<User>();
    useEffect(() => { document.title = ANAME + " - Users" }, []);

    function fetchProcessUsers() { getUsers().then(u => setUsers(u)); }

    const addUser = (u: User) => {
        const run = async () => {
            const upsert = u.id === -1 ? axios.post : axios.put;
            upsert<User>(SERVER + "/user", u)
                .then(r => {
                    notyf.success("User " + (u.id === -1 ? "Added" : "Updated"));
                    fetchProcessUsers();
                }).catch((e) => {
                    notyf.error("User Action Failed");
                });
        };
        run();
    }

    async function deleteItem(id: number) {
        await axios.delete(SERVER + "/user/" + id);
        fetchProcessUsers();
        analytics.track("User - Deleted: " + id);
        console.log("User - Deleted: " + id);
    };

    if(!isAdmin(context)) {
        return <NonIdealState icon="error" title="You are not permitted on this page." ></NonIdealState>;
    }

    return (<><h1>Users</h1>
            <div><HTMLTable condensed striped bordered>
            <thead><tr><th>Name</th><th>Email</th><th>Admin</th><th>Updated</th><th>Created</th></tr></thead>
                <tbody>{users.map((u, idx) => <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><Checkbox checked={u.admin} onChange={()=>addUser({...u,admin:!u.admin})}>
                            {u.admin && <span><Icon icon="user" intent="danger" />Admin</span>}
                        </Checkbox></td>
                    <td>{prettyDate(u.dateUpdated)}</td>
                    <td>{prettyDate(u.dateCreated)}</td>
                    {/* <td>{idx !== 0 && <Button small intent="primary" onClick={() => confirmRestore({...s, version:maxVersion})}>Restore</Button>}</td></tr>)}</tbody> */}
                    {/* <td><Button icon="edit" small onClick={() => { setEditId(u) }} /></td> */}
                    <td><Button icon="delete" intent={Intent.DANGER} small onClick={(e) => { e.stopPropagation(); setDeleteId(u); }} /></td>
                    </tr>)}
                    
                    <Alert cancelButtonText="Cancel" confirmButtonText="Delete" icon="trash" intent={Intent.DANGER} isOpen={deleteId?.id ? true : false}
                        onCancel={() => setDeleteId(undefined)} onConfirm={() => { deleteId?.id && deleteItem(deleteId.id); setDeleteId(undefined) }}
                        canEscapeKeyCancel canOutsideClickCancel>
                        <p>
                            Are you sure you want to delete {deleteId?.name}?
                        </p>
                    </Alert>
                    
            </tbody></HTMLTable>
        
            
        </div>
        </>);
}


// function UserEditor(props:{user:User,clearSelection:()=>void}) {
//     const [saveState,setSaveState] = useState<AjaxResult>({state:""});
//     const [user,setUser] = useState<User>(props.user);
//     const isAdd = user.id === -1;
//     const handleChange = () => {};
    
//     return <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); handleChange(); }}>
//         <MyInput label="Name:" value={user.name} name="name" onChange={handleChange} placeholder={"username"} />
//         <FormGroup label="Email:" labelFor="email" inline labelInfo="(optional)">
//             <InputGroup id="email" value={user.email} name="email" onChange={handleChange} placeholder="user@timestored.com"/>
//         </FormGroup>
//         <FormGroup label="Password:" labelFor="connPass" inline labelInfo={isAdd ? undefined : "(optional)"}>
//             <InputGroup id="connPass" value={user.password} type="password" name="password" onChange={handleChange} placeholder={isAdd ? "" : "*******"} />
//         </FormGroup>
//         <Checkbox label="Admin" checked={user.admin} onChange={handleChange} />
//         <Button intent="primary" type="submit" disabled={saveState.state === "failed" || saveState.state === "running"}>{isAdd ? "Add" : "Save"}</Button>
//         <AjaxResButton mystate={saveState} succeededMsg="Saved" />
//         < br />
//         < br />
//     </form>;
// }