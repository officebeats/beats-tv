import { Component, Input, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.css',
})
export class LoadingComponent implements OnInit, OnDestroy {
  @Input() isCentered: boolean = false;
  count = 0;
  texts: string[] = ['Consider donating to Beats TV', 'Loading your channels...'];
  currentText: string = '';
  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.displayRandomText();
    this.intervalId = setInterval(() => this.displayRandomText(), 3500);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  displayRandomText() {
    if (this.count == this.texts.length) this.count = 0;
    this.currentText = this.texts[this.count++];
  }
}
