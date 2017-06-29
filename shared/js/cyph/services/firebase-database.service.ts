/* tslint:disable:no-import-side-effect */

import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';
import {Observable} from 'rxjs';
import {DataType} from '../data-type';
import {env} from '../env';
import {util} from '../util';
import {DatabaseService} from './database.service';


/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService extends DatabaseService {
	/** @ignore */
	private app: Promise<firebase.app.App>	= util.retryUntilSuccessful(() => {
		try {
			for (const key of Object.keys(localStorage).filter(k => k.startsWith('firebase:'))) {
				/* tslint:disable-next-line:ban */
				localStorage.removeItem(key);
			}
		}
		catch (_) {}

		return firebase.apps[0] || firebase.initializeApp(env.firebaseConfig);
	});

	/** @ignore */
	private usernameToEmail (username: string) : string {
		return `${username}@cyph.me`;
	}

	/** @inheritDoc */
	public async getDatabaseRef (url: string) : Promise<firebase.database.Reference> {
		return util.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).database().refFromURL(url) :
				(await this.app).database().ref(url)
		);
	}

	/** @inheritDoc */
	public async getItem (url: string) : Promise<Uint8Array> {
		return util.requestBytes({
			url: await (await this.getStorageRef(url)).getDownloadURL()
		});
	}

	/** @inheritDoc */
	public async getStorageRef (url: string) : Promise<firebase.storage.Reference> {
		return util.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).storage().refFromURL(url) :
				(await this.app).storage().ref(url)
		);
	}

	/** @inheritDoc */
	public async hasItem (url: string) : Promise<boolean> {
		try {
			await (await this.getStorageRef(url)).getDownloadURL();
			return true;
		}
		catch (_) {
			return false;
		}
	}

	/** @inheritDoc */
	public async lock<T> (url: string, f: () => Promise<T>) : Promise<T> {
		const queue	= await this.getDatabaseRef(url);
		const id	= util.uuid();
		const lock	= queue.push(id);

		lock.onDisconnect().remove();

		try {
			await new Promise<void>(resolve => {
				queue.on('value', async snapshot => {
					const value: string[]	= (snapshot && snapshot.val()) || [];

					if (value[0] !== id) {
						return;
					}

					queue.off();
					resolve();
				});
			});

			return (await f());
		}
		finally {
			lock.remove();
		}
	}

	/** @inheritDoc */
	public async login (username: string, password: string) : Promise<void> {
		await (await this.app).auth().signInWithEmailAndPassword(
			this.usernameToEmail(username),
			password
		);
	}

	/** @inheritDoc */
	public async logout () : Promise<void> {
		await util.retryUntilSuccessful(async () =>
			(await this.app).auth().signOut()
		);
	}

	/** @inheritDoc */
	public async pushItem (url: string, value: DataType) : Promise<void> {
		return this.setItem(`${url}/${(await this.getDatabaseRef(url)).push().key}`, value);
	}

	/** @inheritDoc */
	public async register (username: string, password: string) : Promise<void> {
		await (await this.app).auth().createUserWithEmailAndPassword(
			this.usernameToEmail(username),
			password
		);
	}

	/** @inheritDoc */
	public async removeItem (url: string) : Promise<void> {
		await Promise.all([
			(await this.getDatabaseRef(url)).remove().then(),
			(await this.getStorageRef(url)).delete().then()
		]);
	}

	/** @inheritDoc */
	public async setItem (url: string, value: DataType) : Promise<void> {
		await (await this.getStorageRef(url)).put(new Blob([await util.toBytes(value)])).then();
		await (await this.getDatabaseRef(url)).set(await this.timestamp()).then();
	}

	/** @inheritDoc */
	public async timestamp () : Promise<any> {
		return firebase.database.ServerValue.TIMESTAMP;
	}

	/** @inheritDoc */
	public watchItem (url: string) : Observable<Uint8Array|undefined> {
		return new Observable<Uint8Array|undefined>(observer => {
			(async () => {
				(await this.getDatabaseRef(url)).on('value', async snapshot => {
					if (!snapshot || !snapshot.exists()) {
						observer.next();
					}

					observer.next(await this.getItem(url));
				});
			})();
		});
	}

	/** @inheritDoc */
	public watchList<T = Uint8Array> (
		url: string,
		mapper: (value: Uint8Array) => T = (value: Uint8Array&T) => value
	) : Observable<T[]> {
		return new Observable<T[]>(observer => {
			(async () => {
				const listRef		= await this.getDatabaseRef(url);

				let initRemaining	=
					(<firebase.database.DataSnapshot> await listRef.once('value')).numChildren()
				;

				const data			= new Map<string, {timestamp: number; value: T}>();

				const getValue		= async (snapshot: firebase.database.DataSnapshot) => {
					if (!snapshot.key) {
						return false;
					}
					const timestamp: number	= snapshot.val();
					if (isNaN(timestamp)) {
						return false;
					}
					data.set(
						snapshot.key,
						{timestamp, value: mapper(await this.getItem(`${url}/${snapshot.key}`))}
					);
					return true;
				};

				const publishList	= () => {
					observer.next(
						Array.from(data.keys()).sort().map(k => {
							const o	= data.get(k);
							if (!o) {
								throw new Error('Corrupt Map.');
							}
							return o.value;
						})
					);
				};

				listRef.on('child_added', async snapshot => {
					if (
						!snapshot ||
						!snapshot.key ||
						data.has(snapshot.key) ||
						!(await getValue(snapshot))
					) {
						return;
					}
					if (initRemaining !== 0) {
						--initRemaining;
						if (initRemaining !== 0) {
							return;
						}
					}
					publishList();
				});

				listRef.on('child_changed', async snapshot => {
					if (
						!snapshot ||
						!snapshot.key ||
						!(await getValue(snapshot))
					) {
						return;
					}
					if (initRemaining !== 0) {
						return;
					}
					publishList();
				});

				listRef.on('child_removed', async snapshot => {
					if (!snapshot || !snapshot.key) {
						return;
					}
					data.delete(snapshot.key);
					if (initRemaining !== 0) {
						return;
					}
					publishList();
				});
			})();
		});
	}

	constructor () {
		super();
	}
}
