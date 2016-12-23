import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import {util} from '../../util';
import {Elements} from '../elements';


/**
 * Angular component for taking file input.
 */
@Component({
	selector: 'cyph-file-input',
	templateUrl: '../../../../templates/fileinput.html'
})
export class FileInput {
	/** Optional file type restriction. */
	@Input() public accept: string;

	/** Handler for uploaded files. */
	@Output() public change: EventEmitter<File>	= new EventEmitter<File>();

	constructor (elementRef: ElementRef) { (async () => {
		const $input	= await Elements.waitForElement(
			() => $(elementRef.nativeElement).children()
		);

		const input	= <HTMLInputElement> $input[0];

		$input.
			change(e => {
				e.stopPropagation();
				e.preventDefault();

				if (!input.files || input.files.length < 1) {
					return;
				}

				this.change.emit(input.files[0]);
				$input.val('');
			}).
			click(e => {
				e.stopPropagation();
				e.preventDefault();
			})
		;

		const $button	= await Elements.waitForElement(
			() => $input.closest('button')
		);

		$button.click(() => { util.triggerClick(input); });
	})(); }
}
