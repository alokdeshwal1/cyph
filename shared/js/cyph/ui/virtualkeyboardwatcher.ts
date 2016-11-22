import {EventManager} from '../eventmanager';
import {Elements} from './elements';


/**
 * Keeps track of whether an on-screen virtual keyboard is open.
 */
export class VirtualKeyboardWatcher {
	/** @ignore */
	private static initialScreenSize: number	= self.innerHeight;

	/** @ignore */
	private static keyboardChangeEvent: string	= 'keyboardChangeEvent';

	/** Indicates whether the virtual keyboard is currently open. */
	public static isOpen: boolean	= false;

	/** @ignore */
	private static trigger (isOpen: boolean) : void {
		VirtualKeyboardWatcher.isOpen	= isOpen;
		EventManager.trigger(
			VirtualKeyboardWatcher.keyboardChangeEvent,
			VirtualKeyboardWatcher.isOpen
		);
	}

	/**
	 * Sets handler to run when keyboard status changes.
	 * @param handler
	 */
	public static onchange (handler: Function) : void {
		EventManager.on(VirtualKeyboardWatcher.keyboardChangeEvent, handler);
	}

	/** @ignore */
	/* tslint:disable-next-line:member-ordering */
	private static _	= (() => {
		/* http://stackoverflow.com/a/11650231/459881 */

		/* Android */
		Elements.window().on('resize', () =>
			VirtualKeyboardWatcher.trigger(
				window.innerHeight < VirtualKeyboardWatcher.initialScreenSize
			)
		);

		/* iOS */
		$('input').on('focus blur', () => {
			Elements.window().scrollTop(10);
			VirtualKeyboardWatcher.trigger(Elements.window().scrollTop() > 0);
			Elements.window().scrollTop(0);
		});
	})();
}
