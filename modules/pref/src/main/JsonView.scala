package lila.pref

import play.api.libs.json._

object JsonView {

  implicit val prefJsonWriter = OWrites[Pref] { p =>
    Json.obj(
      "dark"            -> p.dark,
      "transp"          -> p.transp,
      "bgImg"           -> p.bgImgOrDefault,
      "theme"           -> p.theme,
      "pieceSet"        -> p.pieceSet,
      "soundSet"        -> p.soundSet,
      "notation"        -> p.notation,
      "blindfold"       -> p.blindfold,
      "takeback"        -> p.takeback,
      "moretime"        -> p.moretime,
      "clockTenths"     -> p.clockTenths,
      "clockCountdown"  -> p.clockCountdown,
      "clockBar"        -> p.clockBar,
      "clockSound"      -> p.clockSound,
      "premove"         -> p.premove,
      "animation"       -> p.animation,
      "captured"        -> p.captured,
      "follow"          -> p.follow,
      "highlightLastDests" -> p.highlightLastDests,
      "highlightCheck"    -> p.highlightCheck,
      "destination"     -> p.destination,
      "dropDestination" -> p.dropDestination,
      "coords"          -> p.coords,
      "replay"          -> p.replay,
      "challenge"       -> p.challenge,
      "message"         -> p.message,
      "coordColor"      -> p.coordColor,
      "submitMove"      -> p.submitMove,
      "confirmResign"   -> p.confirmResign,
      "insightShare"    -> p.insightShare,
      "keyboardMove"    -> p.keyboardMove,
      "zen"             -> p.zen,
      "moveEvent"       -> p.moveEvent
    )
  }
}
