package shogi
package format.usi

import variant.Variant


object Binary {

    def decodeMoves(variant: Variant, bs: List[Byte])          = Reader.decode(variant, bs)
    def decodeMoves(variant: Variant, bs: List[Byte], nb: Int) = Reader.decode(variant, bs, nb)

    def encodeMove(variant: Variant, m: Usi)             = Writer.encode(variant, m)
    def encodeMoves(variant: Variant, ms: Iterable[Usi]) = Writer.encode(variant, ms)  

    private object Encoding {
       val roleToInt: Map[Role, Int] = Map(
        King -> 0,
        Pawn -> 1,
        Lance -> 2,
        Knight -> 3,
        Silver -> 4,
        Gold -> 5,
        Bishop -> 6,
        Rook -> 7,
        Tokin -> 8,
        PromotedLance -> 9,
        PromotedKnight -> 10,
        PromotedSilver -> 11,
        Horse -> 12,
        Dragon -> 13
      )
      val intToRole: Map[Int, Role] = roleToInt map { case (k, v) => v -> k }
    }

    private object Reader {
        private val maxPlies = 600

        def decode(variant: Variant, bs: List[Byte]): List[Usi] =
          decode(variant, bs, maxPlies * 2)
        def decode(variant: Variant, bs: List[Byte], nb: Int): List[Usi] =
          decodeMovesAndDrops(variant, bs take (nb * 2) map toInt)


        private def decodeMovesAndDrops(variant: Variant, is: List[Int]): List[Usi] =
          is.grouped(2).map {
            case List(i1, i2) =>
              if (bitAt(i1, 7) && variant.hasHandData)
                decodeDrop(variant, i1, i2)
              else decodeMove(variant, i1, i2)
            case x => !!(x map showByte mkString ",")
          }.toList

        private def decodeMove(variant: Variant, i1: Int, i2: Int): Usi =
          Usi.Move(pos(variant, right(i1, 7)), pos(variant, right(i2, 7)), bitAt(i2, 7))

        private def decodeDrop(variant: Variant, i1: Int, i2: Int): Usi =
          Usi.Drop(Encoding.intToRole(right(i1, 7)), pos(variant, right(i2, 7)))

        private def pos(variant: Variant, i: Int): Pos =
          Pos.at(i % variant.numberOfFiles + 1, i / variant.numberOfFiles + 1) getOrElse !!(s"Invalid position (${variant.name}, ${showByte(i)})")

        // right x bits
        private def right(i: Int, x: Int): Int = i & ((1 << x) - 1)
        // from right, starting at 0
        private def bitAt(i: Int, p: Int): Boolean = (i & (1 << p)) != 0

        private def !!(msg: String) = throw new Exception("Binary usi reader failed: " + msg)
        private def showByte(b: Int): String = "%08d" format (b.toBinaryString.toInt)

        @inline private def toInt(b: Byte): Int = b & 0xff
    }

    private object Writer {

      def encode(variant: Variant, usis: Iterable[Usi]): Array[Byte] =
        usis.flatMap(s => encode(variant, s)).to(Array)
      
      def encode(variant: Variant, usi: Usi): List[Byte] =
        usi match {
          case Usi.Move(orig, dest, prom) => encodeMove(variant, orig, dest, prom)
          case Usi.Drop(role, pos) => encodeDrop(variant, role, pos)
        }
      
      def encodeMove(variant: Variant, orig: Pos, dest: Pos, prom: Boolean): List[Byte] =
        List(
          posInt(variant, orig),
          (if (prom) (1 << 7) else 0) | posInt(variant, dest)
        ).map(_.toByte)

      def encodeDrop(variant: Variant, role: Role, pos: Pos): List[Byte] =
        List(
          (1 << 7) | Encoding.roleToInt(role),
          posInt(variant, pos)
        ).map(_.toByte)

      def posInt(variant: Variant, pos: Pos): Int =
        (variant.numberOfFiles * (pos.y - 1)) + (pos.x - 1)
    }

}