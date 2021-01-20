import {
  EditorConfig,
  EditorOptions,
  EditorState,
  Selected,
  Redraw,
  OpeningPosition,
  Pocket,
} from "./interfaces";
import { Api as CgApi } from "shogiground/api";
import {Role} from "shogiground/types";

//import { Setup, Material, RemainingChecks } from 'shogiops/setup';
//import { setupPosition } from 'shogiops/variant';

import { prop, Prop } from "common";
import { initialFen, breakSfen, roleToChar, charToRole } from "shogiutil/util";
import { GameSituation } from "shogiutil/types";
// @ts-ignore
import { Shogi } from "shogiutil/vendor/Shogi.js";

export default class EditorCtrl {
  cfg: EditorConfig;
  options: EditorOptions;
  trans: Trans;
  extraPositions: OpeningPosition[];
  shogiground: CgApi | undefined;
  redraw: Redraw;

  selected: Prop<Selected>;

  turn: Color;
  gs: GameSituation | undefined;

  pocketWhite: Pocket = {
    "pawn": 0,
    "lance": 0,
    "knight": 0,
    "silver": 0,
    "gold": 0,
    "bishop": 0,
    "rook": 0,
  };
  pocketBlack: Pocket = {
    "pawn": 0,
    "lance": 0,
    "knight": 0,
    "silver": 0,
    "gold": 0,
    "bishop": 0,
    "rook": 0,
  };
  pockets = [this.pocketWhite, this.pocketBlack];

  constructor(cfg: EditorConfig, redraw: Redraw) {
    this.cfg = cfg;
    this.options = cfg.options || {};

    this.trans = window.lishogi.trans(this.cfg.i18n);

    this.selected = prop("pointer");
    this.extraPositions = [
      {
        fen: initialFen,
        epd: "1",
        name: this.trans("startPosition"),
      },
      {
        fen: "prompt",
        name: this.trans("loadPosition"),
      },
    ];

    if (cfg.positions) {
      cfg.positions.forEach(
        (p) => (p.epd = p.fen.split(" ").splice(0, 4).join(" "))
      );
    }

    window.Mousetrap.bind("f", (e: Event) => {
      e.preventDefault();
      if (this.shogiground) this.shogiground.toggleOrientation();
      redraw();
    });

    this.redraw = () => {};
    this.setFen(cfg.fen);
    this.redraw = redraw;
  }

  onChange(): void {
    const fen = this.getFen();
    if (!this.cfg.embed) {
      if (fen == initialFen) window.history.replaceState("", "", "/editor");
      else window.history.replaceState("", "", this.makeUrl("/editor/", fen));
    }
    this.options.onChange && this.options.onChange(fen);
    this.redraw();
  }

  private getSetup(): GameSituation {
    const boardFen = this.shogiground
      ? this.shogiground.getFen()
      : this.cfg.fen.split(" ")[0];
    const turn = this.turn ? this.turn : "white";
    const pocketWhite = Object.keys(this.pockets[0]).map(r => {
      return roleToChar(r as Role).toUpperCase().repeat(this.pockets[0][r]);
    });
    const pocketBlack = Object.keys(this.pockets[1]).map(r => {
      return roleToChar(r as Role).repeat(this.pockets[1][r]);
    });
    if (
      !this.gs ||
      boardFen != this.gs.fen.split(" ")[0] ||
      this.gs.player != this.turn ||
      this.gs.crazyhouse?.pockets
    ) {
      this.gs = Shogi.init(breakSfen(boardFen) + " " + turn[0] + " " + pocketWhite + pocketBlack + " 1");
    }
    this.turn = this.gs!.player;
    return this.gs!;
  }

  getFen(): string {
    return breakSfen(this.getSetup().fen);
  }

  private getLegalFen(): string | undefined {
    const gs = this.getSetup();
    if (gs.playable) return this.getFen();
    return undefined;
  }

  private isPlayable(): boolean {
    const gs = this.getSetup();
    return gs.playable && gs.validity;
  }

  getState(): EditorState {
    return {
      fen: this.getFen(),
      legalFen: this.getLegalFen(),
      playable: this.isPlayable(),
    };
  }

  makeAnalysisUrl(legalFen: string): string {
    return this.makeUrl(`/analysis/`, legalFen);
  }

  makeUrl(baseUrl: string, fen: string): string {
    return (
      baseUrl +
      encodeURIComponent(fen).replace(/%20/g, "_").replace(/%2F/g, "/")
    );
  }

  bottomColor(): Color {
    return this.shogiground
      ? this.shogiground.state.orientation
      : this.options.orientation || "white";
  }

  setTurn(turn: Color): void {
    turn = turn === "white" ? "black" : "white";
    this.turn = turn;
    this.onChange();
  }

  startPosition(): void {
    this.setFen(
      "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1"
    );
  }

  clearBoard(): void {
    this.setFen("9/9/9/9/9/9/9/9/9");
  }

  loadNewFen(fen: string | "prompt"): void {
    if (fen === "prompt") {
      fen = (prompt("Paste FEN position") || "").trim();
      if (!fen) return;
    }
    this.setFen(fen);
  }

  parsePocket(pocket: string): string {
    let newPocket = "";
    for(var i = 0; i < pocket.length; i++){
      const l = pocket[i];
      if(parseInt(l))
        newPocket += pocket[++i].repeat(parseInt(l));
      else newPocket += l;
    }
    return newPocket
  }

  setFen(fen: string): boolean {
    if (this.shogiground) this.shogiground.set({ fen });
    this.clearPocket();
    const splitted = fen.split(' ');
    if(splitted.length >= 3){
      const pocket = this.parsePocket(splitted[2]);
      pocket.split('').map(p => {
        const role = charToRole(p);
        if(role)
          this.addToPocket(p.toUpperCase() === p ? 'white' : 'black', role);
      });
    }
    this.turn = splitted[1] == 'b' ? 'black' : 'white';
    this.onChange();
    return true;
  }

  fillGotesHand(): void {
    const pieceCounts: {[index: string]:number} = { L: 4, N: 4, S: 4, G: 4, P: 18, B: 2, R: 2 };
    const unpromote: {[index: string]:string} = { T: 'P', D: 'R', H: 'B', U: 'L', M: 'N', A: 'S' };
    const splitted = this.getFen().split(' ');
    for (var i = 0; i < splitted[0].length; i++) {
      const piece = splitted[0][i].toUpperCase();
      const currPiece = unpromote[piece] ? unpromote[piece] : piece;
      if (pieceCounts[currPiece]) pieceCounts[currPiece]--;
    }
    if (splitted.length >= 3) {
      const pocket = this.parsePocket(splitted[2]);
      for (var i = 0; i < pocket.length; i++) {
        if (pieceCounts[pocket[i]]) pieceCounts[pocket[i]]--;
      }
    }
    this.clearColorPocket('black');
    for (const p in pieceCounts) {
      const role = charToRole(p);
      if (role) {
        while (pieceCounts[p] > 0) {
            this.addToPocket('black', role);
          pieceCounts[p]--;
        }
      }
    }
    this.onChange();
  }

  setOrientation(o: Color): void {
    this.options.orientation = o;
    if (this.shogiground!.state.orientation !== o)
      this.shogiground!.toggleOrientation();
    this.redraw();
  }

  addToPocket(c: Color, r: Role, reload: boolean = false): void {
    if(["pawn", "lance", "knight", "silver", "gold", "bishop", "rook"].includes(r) && this.pockets[c === "white" ? 0 : 1][r] < 18)
      this.pockets[c === "white" ? 0 : 1][r]++;
      if(reload) this.onChange();
  }
  removeFromPocket(c: Color, r: Role, reload: boolean = false): void {
    if(this.pockets[c === "white" ? 0 : 1][r] > 0)
      this.pockets[c === "white" ? 0 : 1][r]--;
    if(reload) this.onChange();
  }
  clearPocket(){
    ["pawn", "lance", "knight", "silver", "gold", "bishop", "rook"].map(p => {
      this.pockets[0][p] = 0;
      this.pockets[1][p] = 0;
    })
  }
  clearColorPocket(c: Color){
    ["pawn", "lance", "knight", "silver", "gold", "bishop", "rook"].map(p => {
      this.pockets[c === "white" ? 0 : 1][p] = 0;
    })
  }
}
