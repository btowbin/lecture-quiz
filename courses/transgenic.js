/* =====================================================================
   COURSE: Transgenic organisms (id 'transgenic')
   Live quiz questions for the 2-hour lecture "Transgenic organisms" (7th semester Biology).
   Word-cloud questions are NOT in this file: they are Instant polls (see transgenic_wordclouds.txt).
   Figures live in courses/transgenic/ (gel.png, cloning_overview.png, ura3_versions.png).
   ===================================================================== */
QUIZ.course('transgenic', ({ r, table }) => ({

  title: 'Transgenic organisms',
  description: 'Questions for the lecture on transgenic organisms: definitions, cloning and restriction digests, and methods of transgenesis.',
  unit: 'Part',

  lectures: {
    1: 'What are transgenic organisms?',
    2: 'Cloning and restriction digest',
    3: 'Methods of transgenesis',
  },

  questions: [

    /* ---------- Part 1: definitions ---------- */

    { id: 'T1-01', lec: 1, diff: 1, topic: 'Definition',
      q: r`Which statement describes a <b>transgenic</b> organism best?`,
      opts: [r`An organism whose genome contains DNA from another species`,
             r`Any organism whose DNA has been changed in any way, including deletions and point mutations`,
             r`An organism produced by crossing two strains of the same species`,
             r`An organism that carries a spontaneous point mutation`],
      exp: r`Transgenic = carries DNA from a <i>different species</i>. “Genetically modified organism” (GMO) is the more general term and also covers deletions, duplications and point mutations.` },

    { id: 'T1-02', lec: 1, diff: 2, topic: 'Transgenic vs. GMO',
      q: r`A researcher uses CRISPR to delete a gene in a mouse. No foreign DNA is added. The mouse is…`,
      opts: [r`genetically modified, but not transgenic`,
             r`transgenic, because the genome was edited`,
             r`neither genetically modified nor transgenic`,
             r`transgenic, because Cas9 comes from bacteria`],
      exp: r`The genome was modified on purpose (GMO), but no DNA from another species was inserted, so the mouse is not transgenic in the strict sense.` },

    /* ---------- Part 2: cloning exercise ---------- */

    { id: 'T2-01', lec: 2, diff: 2, topic: 'Restriction digest',
      q: r`You ligated a <b>1020 bp blunt-ended insert</b> (EGFP) into a <b>3359 bp vector</b>. The insert contains one HindIII site (748 bp from its left end), the vector one XbaI site and no HindIII site. In the correct plasmid (4379 bp) HindIII cuts at 1105, XbaI at 2058; PvuII cuts at 357 and 1377. Because the ends are blunt, the insert can enter in <b>either orientation</b>.<br>Which digest tells you that the plasmid contains the insert <b>in the correct orientation</b>?`,
      fig: { img: 'transgenic/cloning_overview.png' },
      opts: [r`HindIII + XbaI`,
             r`PvuII alone`,
             r`XbaI alone`,
             r`HindIII alone`],
      exp: r`HindIII cuts only inside the insert and XbaI only in the vector, so the distance between the two sites depends on the orientation. PvuII sites flank the insert (1020 bp apart) and give the same pattern in both orientations; XbaI or HindIII alone only linearise the plasmid.` },

    { id: 'T2-02', lec: 2, diff: 2, topic: 'Reading a gel',
      q: r`Four clones were digested with HindIII + XbaI (MW = 1 kb ladder). Which lane contains the <b>correct</b> plasmid (insert present, correct orientation)?`,
      fig: { img: 'transgenic/gel.png' },
      opts: [r`Lane 1: about 3.4 kb and 1.0 kb`,
             r`Lane 2: about 3.4 kb, 1.5 kb and 0.5 kb`,
             r`Lane 3: one band of about 3.4 kb`,
             r`Lane 4: about 2.9 kb and 1.5 kb`],
      exp: r`Correct plasmid: 3399 bp + 980 bp (lane 1).<br>Lane 2: 3399 + 1460 + 540 bp = double insert, inverted. Lane 3: 3359 bp = vector without insert. Lane 4: 2919 + 1460 bp = insert in the inverted orientation.` },

    { id: 'T2-03', lec: 2, diff: 2, topic: 'Reading a gel',
      q: r`After HindIII + XbaI digestion, a clone shows only <b>one band of about 3.4 kb</b> (lane 3 in the gel shown). What happened?`,
      fig: { img: 'transgenic/gel_plasmid.png' },
      expfig: { img: 'transgenic/map_lane3_empty.png' },
      opts: [r`The vector re-ligated without an insert: XbaI linearised it (3359 bp) and HindIII does not cut it`,
             r`The insert is present, but inverted`,
             r`The insert is present twice, in tandem`,
             r`The plasmid was not digested at all`],
      exp: r`The empty vector has no HindIII site, so only XbaI cuts and a single 3359 bp linear fragment results.` },

    { id: 'T2-04', lec: 2, diff: 2, topic: 'Reading a gel',
      q: r`After HindIII + XbaI digestion, a clone shows <b>two bands of about 2.9 kb and 1.5 kb</b> (lane 4 in the gel shown). What explains the pattern?`,
      fig: { img: 'transgenic/gel_insert_vector.png' },
      expfig: { img: 'transgenic/map_lane4_inverted.png' },
      opts: [r`A single insert ligated in the wrong (inverted) orientation`,
             r`A single insert in the correct orientation`,
             r`A vector without insert`,
             r`Two inserts in tandem`],
      exp: r`The total (2919 + 1460 = 4379 bp) equals vector plus one insert, so there is one insert; but HindIII–XbaI distance is 1460 instead of 980 bp, so the insert is inverted.` },

    { id: 'T2-05', lec: 2, diff: 3, topic: 'Reading a gel',
      q: r`After HindIII + XbaI digestion, a clone shows three bands of about <b>3.4 kb, 1.5 kb and 0.5 kb</b> (lane 2 in the gel shown). Which interpretation fits best?`,
      fig: { img: 'transgenic/gel.png' },
      opts: [r`Two inserts were ligated into the vector, at least one of them inverted`,
             r`One insert in the correct orientation plus an incompletely digested plasmid`,
             r`A vector without insert`,
             r`One insert in the inverted orientation`],
      exp: r`The three fragments add up to 5399 bp = 3359 + 2 × 1020, i.e. a vector with two inserts. The 540 bp fragment and the 1460 bp fragment show that at least one copy sits in the inverted orientation.` },

    { id: 'T2-06', lec: 2, diff: 1, topic: 'Ligation',
      q: r`Why can a blunt-ended insert enter a vector in either orientation?`,
      opts: [r`Blunt ends have no overhangs, so both ends of the insert fit both ends of the cut vector`,
             r`Blunt ends are always ligated twice as efficiently`,
             r`Blunt-end ligation does not need DNA ligase`,
             r`The insert contains palindromic sequences at both ends`],
      exp: r`Sticky ends with two different overhangs only fit in one orientation (directional cloning). Blunt ends are all compatible, so both orientations (and multiple inserts) occur.` },

    /* ---------- Part 3: methods of transgenesis ---------- */

    { id: 'T3-01', lec: 3, diff: 2, topic: 'Homologous recombination',
      q: r`Version 1: a <b>linear</b> fragment carrying <i>transgene + URA3</i> between two homology arms is transformed into yeast. How does it end up in the genome?`,
      fig: { img: 'transgenic/ura3_versions.png' },
      opts: [r`Two crossovers, one in each homology arm: the genomic region between them is replaced by the insert`,
             r`One crossover: the entire fragment is added next to the genomic locus, duplicating the homology`,
             r`Random integration, because no homology is needed`,
             r`It cannot integrate, because it carries no origin of replication`],
      exp: r`With flanking homology on both sides, a double crossover swaps the genomic sequence for the insert (gene replacement).` },

    { id: 'T3-02', lec: 3, diff: 2, topic: 'Homologous recombination',
      q: r`Version 2: a <b>circular</b> plasmid carrying <i>transgene + URA3</i> is cut inside the URA3 homology and transformed into a yeast strain with a defective genomic <i>ura3</i> locus. What is the result?`,
      fig: { img: 'transgenic/ura3_versions.png' },
      opts: [r`A single crossover integrates the whole plasmid; the homologous sequence is now present twice, as a direct repeat flanking the insert`,
             r`A double crossover replaces the genomic <i>ura3</i> by the transgene only`,
             r`The plasmid integrates at a random place in the genome`,
             r`Nothing integrates, since only linear DNA can recombine`],
      exp: r`A single crossover inserts the entire plasmid and duplicates the homologous region. The direct repeats can recombine again, so the integrant can be lost.` },

    { id: 'T3-03', lec: 3, diff: 3, topic: 'Marker-free strategy',
      q: r`You can transform a <i>ura3</i>-deficient yeast strain with a URA3 gene, and you can use 5-FOA, a compound that kills cells expressing URA3.` +
         table(['strain', 'growth on −ura', 'growth on +ura', 'growth on 5-FOA + ura'], [['ΔURA3', 'no', 'yes', 'yes'], ['ΔURA3 + transgenic URA3', 'yes', 'yes', 'no']]) +
         r`Which strategy gives a strain with the transgene but <b>without the URA3 marker</b>?`,
      opts: [r`Integrate with URA3 as selectable marker (grow on −ura), then plate on 5-FOA: survivors have lost URA3 by recombination between the repeats; check by PCR which of them kept the transgene`,
             r`Plate the transformed cells directly on 5-FOA`,
             r`Transform the transgene without URA3 and select on −ura`,
             r`Integrate with URA3 and keep the cells on +ura medium without selection`],
      exp: r`Step 1: URA3 allows selection of integrants (−ura). Step 2: 5-FOA selects <i>against</i> URA3, so only cells that looped out URA3 (by recombination between the duplicated homology) survive. Some of them keep the transgene, others return to wild type, so the clones must be genotyped.<br>Direct plating on 5-FOA only selects for cells that never took up URA3; without URA3 on the construct, −ura selects nothing.` },

    { id: 'T3-04', lec: 3, diff: 2, topic: 'Counter-selection',
      q: r`A yeast clone with an integrated URA3 cassette (<i>ura3</i> deficient background) is plated on medium with <b>uracil + 5-FOA</b>. Which cells grow?`,
      opts: [r`Cells that have lost the URA3 gene or its function`,
             r`All cells that carry URA3`,
             r`Only cells that cannot make uracil and are not supplied with it`,
             r`No cells, because 5-FOA kills all yeast`],
      exp: r`URA3 converts 5-FOA into a toxic compound. Cells expressing URA3 die; cells that lost URA3 survive because uracil is supplied in the medium.` },

    { id: 'T3-05', lec: 3, diff: 1, topic: 'Double-strand breaks',
      q: r`Which of the following methods does <b>not</b> rely on inducing a double-strand break at the target site to insert DNA?`,
      opts: [r`Classical gene targeting by homologous recombination in yeast or mouse ES cells, without a nuclease`,
             r`Zinc-finger nucleases`,
             r`TALENs`,
             r`CRISPR/Cas9`],
      exp: r`Zinc-finger nucleases, TALENs and CRISPR/Cas9 all create a double-strand break at a chosen site, which strongly stimulates repair and insertion of the donor DNA. Classical gene targeting relies on spontaneous homologous recombination (rare in animal cells).` },

    { id: 'T3-06', lec: 3, diff: 2, topic: 'Double-strand breaks',
      type: 'tf',
      q: r`Which of these methods use <b>induced double-strand breaks</b> as a means to insert DNA?`,
      statements: [
        { t: r`Zinc-finger nucleases`, ok: true, exp: r`ZFN: zinc-finger domains bring the FokI nuclease to the target.` },
        { t: r`TALENs`, ok: true, exp: r`TALE repeats bring the FokI nuclease to the target.` },
        { t: r`CRISPR/Cas9`, ok: true, exp: r`Cas9 cuts where the guide RNA matches (next to a PAM).` },
        { t: r`Transposon excision (insert a transposon, then activate it)`, ok: true, exp: r`Excision of the transposon leaves a double-strand gap that is repaired using a donor.` },
        { t: r`Gene targeting in mouse ES cells with a targeting vector only`, ok: false, exp: r`This relies on rare spontaneous homologous recombination, no nuclease.` },
        { t: r`Selection with 5-FOA`, ok: false, exp: r`5-FOA is a counter-selection, not a way to insert DNA.` },
      ],
      exp: r`Induced double-strand breaks (ZFN, TALEN, CRISPR, transposon excision) greatly increase the frequency of editing at the target site.` },

    { id: 'T3-07', lec: 3, diff: 1, topic: 'Cheapest method',
      q: r`Which method is the <b>cheapest</b> to re-target to a new genomic sequence?`,
      opts: [r`CRISPR/Cas9: only a short guide RNA (about 20 nt) has to be synthesised`,
             r`Zinc-finger nucleases: a new protein with several zinc-finger domains has to be built`,
             r`TALENs: a new protein with one repeat per base (about 15–20 repeats) has to be assembled`,
             r`All three cost about the same`],
      exp: r`ZFNs and TALENs recognise DNA through protein domains, so every new target needs a newly engineered protein. For Cas9, the same protein is reused and only the cheap RNA is exchanged.` },

    { id: 'T3-08', lec: 3, diff: 2, topic: 'Most flexible method',
      q: r`Which method places the <b>fewest restrictions on the target DNA sequence</b>?`,
      opts: [r`TALENs: each repeat recognises one base, only a T is needed at the 5′ end of the site`,
             r`Zinc-finger nucleases: each finger recognises a DNA triplet, and not all triplets have a good finger`,
             r`CRISPR/Cas9 (SpCas9): the target must be next to an NGG PAM`,
             r`All three can target any sequence equally well`],
      exp: r`ZFNs are limited by the triplet code (G-rich triplets work best, neighbouring fingers influence each other). SpCas9 needs an NGG PAM next to the site. TALENs have the simplest code (1 repeat = 1 base) and almost no sequence restriction. TALENs are the most flexible in sequence but laborious and expensive; CRISPR trades some flexibility for cost and speed (newer Cas variants relax the PAM).` },
  ]
}));
