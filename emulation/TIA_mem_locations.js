var TIA = (function(tia) {

  var tia = {};


  tia.mem = 
  {
    //TIA Memory location names
    //info here from nocash.emubase.de/2k6specs.htm
    //
    //Write only addresses

    VSYNC:  0x00,   // ......1. vertical sync set-clear
    VBLANK: 0x01,   // 11....1. vertical blank set-clear
    WSYNC:  0x02,   // <strobe> wait for leading edge of horizontal blank
    RSYNC:  0x03,   // <strobe> reset horizontal sync counter
    NUSIZ0: 0x04,   // ..111111 number-size player-missile 0
    NUSIZ1: 0x05,   // ..111111 number-size player-missile 1
    COLUP0: 0x06,   // 1111111. color-lum player 0 and missile 0
    COLUP1: 0x07,   // 1111111. color-lum player 1 and missile 1
    COLUPF: 0x08,   // 1111111. color-lum playfield and ball 
    COLUBK: 0x09,   // 1111111. color-lum background
    CTRLPF: 0x0A,   // ..11.111 control playfield ball size & collisions
    REFP0:  0x0B,   // ....1... reflect player 0
    REFP1:  0x0C,   // ....1... reflect player 1
    PF0:    0x0D,   // 1111.... playfield register byte 0 (read LSB first 4-7)
    PF1:    0x0E,   // 11111111 playfield register byte 1 (read MSB first 7-0)
    PF2:    0x0F,   // 11111111 playfield register byte 1 (read LSB first 0-7)
    RESP0:  0x10,   // <strobe> reset player 0
    RESP1:  0x11,   // <strobe> reset player 1
    RESM0:  0x12,   // <strobe> reset missile 0
    RESM1:  0x13,   // <strobe> reset missile 1
    RESBL:  0x14,   // <strobe> reset ball
    AUDC0:  0x15,   // ....1111 audio control 0
    AUDC1:  0x16,   // ....1111 audio control 1
    AUDF0:  0x17,   // ..111111 audio frequency 0
    AUDF1:  0x18,   // ..111111 audio frequency 1
    AUDV0:  0x19,   // ....1111 audio volume 0
    AUDV1:  0x1A,   // ....1111 audio volume 1
    GRP0:   0x1B,   // 11111111 graphics player 0
    GRP1:   0x1C,   // 11111111 graphics player 1
    ENAM0:  0x1D,   // ......1. graphics (enable) missile 0
    ENAM1:  0x1E,   // ......1. graphics (enable) missile 1
    ENABL:  0x1F,   // ......1. graphics (enable) ball
    HMP0:   0x20,   // 1111.... horizontal motion player 0
    HMP1:   0x21,   // 1111.... horizontal motion player 1
    HMM0:   0x22,   // 1111.... horizontal motion missile 0
    HMM1:   0x23,   // 1111.... horizontal motion missile 1
    HMBL:   0x24,   // 1111.... horizontal motion ball
    VDELP0: 0x25,   // .......1 vertical delay player 0
    VDELP1: 0x26,   // .......1 vertical delay player 1
    VDELBL: 0x27,   // .......1 vertical delay ball
    RESMP0: 0x28,   // ......1. reset missile 0 to player 0
    RESMP1: 0x29,   // ......1. reset missile 1 to player 1
    HMOVE:  0x2A,   // <strobe> apply horizontal motion
    HMCLR:  0x2B,   // <strobe> clear horizontal motion registers
    CXCLR:  0x2C,   // <strobe> clear collision latches

    //Read only addresses

    CXM0P:  0x30,   // 11...... read collision m0 to p1 and m0 to p0 (bit 7 and 6)
    CXM1P:  0x31,   // 11...... read collision m1 to p0 and m1 to p1 (bit 7 and 6) TODO:look this up, seems like it might not be correct
    CXP0FB: 0x32,   // 11...... read collision p0 to pf and p0 to bl (bit 7 and 6) TODO:look this up, seems like it might not be correct
  }

  tia.strobe = 
  [
    tia.mem.WSYNC,
    tia.mem.RSYNC,
    tia.mem.RESP0,
    tia.mem.RESP1,
    tia.mem.RESM0,
    tia.mem.RESM1,
    tia.mem.RESBL
  ]

});
