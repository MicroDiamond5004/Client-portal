export type ELMATicket = {
    fio: string[] | null;
    __id: string | null;
    fio2: string[] | null;
    otel1: string[] | null;
    otel2: string[] | null;
    otel3: string[] | null;
    sbor1: null | string | number | boolean;
    sbor2: null | string | number | boolean;
    sbor3: null | string | number | boolean;
    schet: null | string | number | boolean;
    __file: null | string | number | boolean;
    __name: string | null;
    oplata: null | string | number | boolean;
    pribyl: null | string | number | boolean;
    tarif1: null | string | number | boolean;
    tarif2: null | string | number | boolean;
    tarif3: null | string | number | boolean;
    vazhno: string | null;
    zapros: string | null;
    __debug: boolean | null;
    __index: number | null;
    __tasks: {
        url: string | null;
        __id: string | null;
        path: string | null;
        place: string | null;
        state: string | null;
        __item: {
            id: string | null;
            code: string | null;
            namespace: string | null;
        };
        __name: string | null;
        branch: string | null;
        dueDate: null | string | number | boolean;
        openRef: boolean | null;
        planEnd: null | string | number | boolean;
        timerId: string | null;
        __logged: boolean | null;
        __target: string | null;
        instance: {
            __id: string | null;
            code: string | null;
            __name: string | null;
            namespace: string | null;
        };
        priority: number | null;
        template: string | null;
        __context: string[] | null;
        __percent: number | null;
        companies: null | string | number | boolean;
        planStart: null | string | number | boolean;
        performers: string[] | null;
        reassignes: null | string | number | boolean;
        __createdAt: string | null;
        __createdBy: string | null;
        __deletedAt: null | string | number | boolean;
        __updatedAt: string | null;
        __updatedBy: string | null;
        description: string | null;
        __targetData: null | string | number | boolean;
        detachedInfo: null | string | number | boolean;
        allowReassign: boolean | null;
        templateNsAndCode: string | null;
        originalPerformers: string[] | null;
        externalParticipants: null | string | number | boolean;
    }[] | null;
    artikul: null | string | number | boolean;
    kontakt: string[] | null;
    pasport: string[] | null;
    skidka1: null | string | number | boolean;
    vaucher: null | string | number | boolean;
    __status: {
        order: number | null;
        status: number | null;
    } | null;
    stoimost: {
        cents: number | null;
        currency: string | null;
    } | null;
    __version: number | null;
    ekvairing: null | string | number | boolean;
    marshrut1: null | string | number | boolean;
    marshrut2: null | string | number | boolean;
    marshrut3: null | string | number | boolean;
    marshrut4: null | string | number | boolean;
    marshrut5: null | string | number | boolean;
    marshrut6: null | string | number | boolean;
    menedzher: null | string | number | boolean;
    srochnost: boolean | null;
    stoimost2: {
        cents: number | null;
        currency: string | null;
    } | null;
    stoimost3: {
        cents: number | null;
        currency: string | null;
    } | null;
    tip_zakaz: {
        code: string | null;
        name: string | null;
    }[] | null;
    marshrutnaya_kvitanciya: string[] | null;
    adjustment: null | string | number | boolean;
    aviabilety: string[] | null;
    karta_mest: null | string | number | boolean;
    kod_uslugi: null | string | number | boolean;
    komissiya1: null | string | number | boolean;
    komissiya2: null | string | number | boolean;
    komissiya3: null | string | number | boolean;
    platalshik: string[] | null;
    postavshik: string[] | null;
    schet_fail: null | string | number | boolean;
    taim_limit: string | null;
    __createdAt: string | null;
    __createdBy: string | null;
    __deletedAt: null | string | number | boolean;
    __directory: null | string | number | boolean;
    __updatedAt: string | null;
    __updatedBy: string | null;
    bd_zakaza_1: string[] | null;
    data_vyleta: null | string | number | boolean;
    karta_mest1: null | string | number | boolean;
    postavshik2: string[] | null;
    postavshik3: string[] | null;
    spravochnik: string[] | null;
    tip_nomera1: string[] | null;
    tip_nomera2: string[] | null;
    tip_nomera3: string[] | null;
    tip_pitani2: string[] | null;
    zamechaniya: null | string | number | boolean;
    __externalId: null | string | number | boolean;
    data_vyezda1: null | string | number | boolean;
    data_vyezda2: null | string | number | boolean;
    data_vyezda3: null | string | number | boolean;
    data_zaezda1: null | string | number | boolean;
    data_zaezda2: null | string | number | boolean;
    data_zaezda3: null | string | number | boolean;
    forma_oplaty: null | string | number | boolean;
    nevozvratnyi: null | string | number | boolean;
    nomer_zakaza: string | null;
    sbor_pokupka: {
        cents: number | null;
        currency: string | null;
    } | null;
    sbor_vozvrat: null | string | number | boolean;
    __subscribers: string[] | null;
    korrektirovka: null | string | number | boolean;
    otvet_klientu: string | null;
    sebestoimost1: null | string | number | boolean;
    sebestoimost2: null | string | number | boolean;
    sebestoimost3: null | string | number | boolean;
    tip_pitaniya1: string[] | null;
    tip_pitaniya3: string[] | null;
    manager_answer: string[] | null;
    otvet_klientu1: string | null;
    otvet_klientu3: null | string;
    razmer_shtrafa: null | string | number | boolean;
    __register_name: null | string | number | boolean;
    data_ofrmleniya: null | string | number | boolean;
    fio_passazhira1: null | string | number | boolean;
    fio_passazhira2: null | string | number | boolean;
    fio_passazhira3: null | string | number | boolean;
    fio_passazhira4: null | string | number | boolean;
    fio_passazhira5: null | string | number | boolean;
    fio_passazhira6: null | string | number | boolean;
    otvet_na_zapros: null | string | number | boolean;
    sbor_la_pokupka: null | string | number | boolean;
    summa_do_skidki: null | string | number | boolean;
    uchetnaya_zapis: null | string | number | boolean;
    nalichie_khostov: null | string | number | boolean;
    skrin_iz_sistemy: null | string | number | boolean;
    dopolnitelnye_fio: string[];
    prichina_snyatiya: null | string;
    __tasks_performers: string[];
    itogovaya_stoimost: {
        cents: number;
        currency: string;
    };
    ssylka_na_kartochku: string;
    isChanged: boolean | null;
    passports?: Record<string, string>
    prilozhenie_k_zaprosu?: string[];
    taim_limit_dlya_klienta?: string;
    // Брони 1–6
  nomer_a_pasporta_ov_dlya_proverki?: string | null;
  nomer_a_pasporta_ov_dlya_proverki_bron_2?: string | null;
  nomer_a_pasporta_ov_dlya_proverki_bron_3?: string | null;
  nomer_a_pasporta_ov_dlya_proverki_bron_4?: string | null;
  nomer_a_pasporta_ov_dlya_proverki_bron_5?: string | null;
  nomer_a_pasporta_ov_dlya_proverki_bron_6?: string | null;

  otvet_klientu_o_bronirovanii_2?: string | null;
  otvet_klientu3_bron_2?: string | null;
  kod_bronirovaniya_v_sisteme_bron_2?: string | null;
  taim_limit_dlya_klienta_bron_2?: string | null;

  otvet_klientu_o_bronirovanii_3?: string | null;
  otvet_klientu3_bron_3?: string | null;
  kod_bronirovaniya_v_sisteme_bron_3?: string | null;
  taim_limit_dlya_klienta_bron_3?: string | null;

  otvet_klientu_o_bronirovanii_4?: string | null;
  otvet_klientu3_bron_4?: string | null;
  kod_bronirovaniya_v_sisteme_bron_4?: string | null;
  taim_limit_dlya_klienta_bron_4?: string | null;

  otvet_klientu_o_bronirovanii_5?: string | null;
  otvet_klientu3_bron_5?: string | null;
  kod_bronirovaniya_v_sisteme_bron_5?: string | null;
  taim_limit_dlya_klienta_bron_5?: string | null;

  otvet_klientu_o_bronirovanii_6?: string | null;
  otvet_klientu3_bron_6?: string | null;
  kod_bronirovaniya_v_sisteme_bron_6?: string | null;
  taim_limit_dlya_klienta_bron_6?: string | null;
  kod_bronirovaniya_v_sisteme?: string | null;
};

export type TicketsData = {
    "success": boolean;
    "error": string;
    "result": {
        "result": ELMATicket[];
        "total": number;
    }
}
