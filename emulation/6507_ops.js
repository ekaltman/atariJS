var CPU_6507 = (function(cpu) {

  var cpu = {};

  // Instruction hex values and function summaries, taken from:
  // nocash.emubase.de/2k6specs.htm
  // "word" is 16bit in length
  cpu.inst =
  {
    //Standard Instruction set values

    //ADC Add with carry in accumulator
    ADC_im:   0x69, //A = A + C + NN
    ADC_zp:   0x65, //A = A + C + [NN]
    ADC_zpX:  0x75, //A = A + C + [NN + X]
    ADC_abs:  0x6D, //A = A + C + [NNNN]
    ADC_absX: 0x7D, //A = A + C + [NNNN + X]
    ADC_absY: 0x79, //A = A + C + [NNNN + Y]
    ADC_pre:  0x61, //A = A + C + [word[NN + X]]
    ADC_post: 0x71, //A = A + C + [word[NN] + Y]

    //AND Logical AND with accumulator
    AND_im:   0x29, //A = A AND NN
    AND_zp:   0x25, //A = A AND [NN]
    AND_zpX:  0x35, //A = A AND [NN + X]
    AND_abs:  0x2D, //A = A AND [NNNN]
    AND_absX: 0x3D, //A = A AND [NNNN + X]
    AND_absY: 0x39, //A = A AND [NNNN + Y]
    AND_pre:  0x21, //A = A AND [word[NN + X]]
    AND_post: 0x31, //A = A AND [word[NN] + Y]

    //Bit shift left
    ASL_A:    0x0A, //A << 1
    ASL_zp:   0x06, //[NN] << 1
    ASL_zpX:  0x16, //[NN + X] << 1
    ASL_abs:  0x0E, //[NNNN] << 1
    ASL_absX: 0x1E, //[NNNN + X] << 1

    //BIT Test a bit weird
    //Performs a logical AND between value at memory address and A
    //DOES NOT change the value of either A or memory address
    //Sets Z = 1 if A AND value in memory are 0, Z = 1 otherwise
    //Sets V to bit 6 of value in memory
    //Sets S to bit 7 of value in memory
    BIT_zp:   0x24,
    BIT_abs:  0x2C,

    //Conditional Branches
    BPL:      0x10, //N = 0 plus / positive (branch positive)
    BMI:      0x30, //N = 1 minus / negative / signed (branch negative)
    BVC:      0x50, //V = 0 branch no overflow
    BVS:      0x70, //V = 1 branch overflow
    BCC_BLT:  0x90, //C = 0 less / below / no carry
    BCS_BGE:  0xB0, //C = 1 greater / equal / carry
    BNE_BZC:  0xD0, //Z = 0 not zero / not equal
    BEQ_BZS:  0xF0, //Z = 1 zero / equal

    //Break
    BRK:      0x00, //B = 1, [S] = PC + 1, [S] = P, I = 1, PC = [FFFE]

    //Clear status (P) bits
    CLC:      0x18, //C = 0
    CLI:      0x58, //I = 0
    CLD:      0xD8, //D = 0
    CLV:      0xB8, //V = 0

    //Comparison 
    CMP_im:   0xC9, //A - NN
    CMP_zp:   0xC5, //A - [NN]
    CMP_zpX:  0xD5, //A - [NN + X]
    CMP_abs:  0xCD, //A - [NNNN]
    CMP_absX: 0xDD, //A - [NNNN + X]
    CMP_absY: 0xD9, //A - [NNNN + Y]
    CMP_pre:  0xC1, //A - [word[NN + X]]
    CMP_post: 0xD1, //A - [word[NN] + Y]
    CPX_im:   0xE0, //X - NN
    CPX_zp:   0xE4, //X - [NN]
    CPX_abs:  0xEC, //X - [NNNN]
    CPY_im:   0xC0, //Y - NN
    CPY_zp:   0xC4, //Y - [NN]
    CPY_abs:  0xCC, //Y - [NNNN]

    //Decrement by 1
    DEC_zp:   0xC6, //[NN] = [NN] - 1
    DEC_zpX:  0xD6, //[NN + X] = [NN + X] - 1
    DEC_abs:  0xCE, //[NNNN] = [NNNN] - 1
    DEC_absX: 0xDE, //[NNNN + X] = [NNNN + X] - 1
    DEX:      0xCA, //X = X - 1
    DEY:      0x88, //Y = Y - 1

    //Exclusive OR
    EOR_im:   0x49, //A = A XOR NN
    EOR_zp:   0x45, //A = A XOR [NN]
    EOR_zpX:  0x55, //A = A XOR [NN + X]
    EOR_abs:  0x4D, //A = A XOR [NNNN]
    EOR_absX: 0x5D, //A = A XOR [NNNN + X]
    EOR_absY: 0x59, //A = A XOR [NNNN + Y]
    EOR_pre:  0x41, //A = A XOR [word[NN + X]]
    EOR_post: 0x51, //A = A XOR [word[NN] + Y]

    //Increment by 1
    INC_zp:   0xE6, //[NN] = [NN] + 1
    INC_zpX:  0xF6, //[NN + X] = [NN + X] + 1
    INC_abs:  0xEE, //[NNNN] = [NNNN] + 1
    INC_absX: 0xFE, //[NNNN + X] = [NNNN + X] + 1
    INX:      0XE8, //X = X + 1
    INY:      0XC8, //Y = Y + 1

    //Jumps
    JMP_dir:  0x4C, //PC = NNNN
    JMP_indir:0x6C, //PC = word[NNNN]
    JSR:      0x20, //[S] = PC + 2, PC = NNNN (call)

    //Loads
    LDA_im:   0xA9, //A = NN
    LDA_zp:   0xA5, //A = [NN]
    LDA_zpX:  0xB5, //A = [NN + X]
    LDA_abs:  0xAD, //A = [NNNN]
    LDA_absX: 0xBD, //A = [NNNN + X]
    LDA_absY: 0xB9, //A = [NNNN + Y]
    LDA_pre:  0xA1, //A = [word[NN + X]]
    LDA_post: 0xB1, //A = [word[NN] + Y]
    LDX_im:   0xA2, //X = NN
    LDX_zp:   0xA6, //X = [NN]
    LDX_zpY:  0xB6, //X = [NN + Y]
    LDX_abs:  0xAE, //X = [NNNN]
    LDX_absY: 0xBE, //X = [NNNN + Y]
    LDY_im:   0xA0, //Y = NN
    LDY_zp:   0xA4, //Y = [NN]
    LDY_zpX:  0xB4, //Y = [NN + X]
    LDY_abs:  0xAC, //Y = [NNNN]
    LDY_absX: 0xBC, //Y = [NNNN + X]

    //Logical shift right
    LSR_A:    0x4A, //A >> 1
    LSR_zp:   0x46, //[NN] >> 1
    LSR_zpX:  0x56, //[NN + X] >> 1
    LSR_abs:  0x4E, //[NNNN] >> 1
    LSR_absX: 0x5E, //[NNNN + X] >> 1

    //No operations
    NOP:      0xEA, //no op

    //Logical OR with accumulator
    ORA_im:   0x09, //A = A OR NN
    ORA_zp:   0x05, //A = A OR [NN]
    ORA_zpX:  0x15, //A = A OR [NN + X]
    ORA_abs:  0x0D, //A = A OR [NNNN]
    ORA_absX: 0x1D, //A = A OR [NNNN + X]
    ORA_absY: 0x19, //A = A OR [NNNN + Y]
    ORA_pre:  0x01, //A = A OR [word[NN + X]]
    ORA_post: 0x11, //A = A OR [word[NN] + Y]

    //Push to stack
    PHA:      0x48, //[S] = A, S = S - 1
    PHP:      0x08, //[S] = P, S = S - 1

    //Pop off stack
    PLA:      0x68, //S = S + 1, A = [S]
    PLP:      0x28, //S = S + 1, P = [S]

    //Bit rotate left
    ROL_A:    0x2A, //rotate A left through carry
    ROL_zp:   0x26, //rotate [NN] left through carry
    ROL_zpX:  0x36, //rotate [NN + X] left through carry
    ROL_abs:  0x2E, //rotate [NNNN] left through carry
    ROL_absX: 0x3E, //rotate [NNNN + X] left through carry

    //Bit rotate right
    ROR_A:    0x6A, //rotate A right through carry
    ROR_zp:   0x66, //rotate [NN] right through carry
    ROR_zpX:  0x76, //rotate [NN + X] right through carry
    ROR_abs:  0x6E, //rotate [NNNN] right through carry
    ROR_absX: 0x7E, //rotate [NNNN + X] right through carry

    //Return from instructions
    RTI:      0x40, //P = [S], PC = [S] (return from break)
    RTS:      0x60, //PC = [S] + 1 (return from call)

    //Subtract from accumulator
    SBC_im:   0xE9, //A = A + C - 1 - NN
    SBC_zp:   0xE5, //A = A + C - 1 - [NN]
    SBC_zpX:  0xF5, //A = A + C - 1 - [NN + X]
    SBC_abs:  0xED, //A = A + C - 1 - [NNNN]
    SBC_absX: 0xFD, //A = A + C - 1 - [NNNN + X]
    SBC_absY: 0xF9, //A = A + C - 1 - [NNNN + Y]
    SBC_pre:  0xE1, //A = A + C - 1 - [word[NN + X]]
    SBC_post: 0xF1, //A = A + C - 1 - [word[NN] + Y]

    //Set status (P) bits
    SEC:      0x38, //C = 1
    SED:      0xF8, //D = 1
    SEI:      0x78, //I = 1

    //Stores
    STA_zp:   0x85, //[NN] = A
    STA_zpX:  0x95, //[NN + X] = A
    STA_abs:  0x8D, //[NNNN] = A
    STA_absX: 0x9D, //[NNNN + X] = A
    STA_absY: 0x99, //[NNNN + Y] = A
    STA_pre:  0x81, //[word[NN + X]] = A
    STA_post: 0x91, //[word[NN] + Y] = A
    STX_zp:   0x86, //[NN] = X
    STX_zpY:  0x96, //[NN + Y] = X
    STX_abs:  0x8E, //[NNNN] = X
    STY_zp:   0x84, //[NN] = Y
    STY_zpX:  0x94, //[NN + X] = Y
    STY_abs:  0x8C, //[NNNN] = Y

    //Transfer values
    TAY:      0xA8, //Y = A
    TAX:      0xAA, //X = A
    TSX:      0xBA, //X = S
    TYA:      0x98, //A = Y
    TXA:      0x8A, //A = X
    TXS:      0x9A, //S = X

    //Illegal (or undocumented) instruction set 
    //TODO: implement if there is time and if certain
    //ROMs require it
  }

  return cpu;
})();
