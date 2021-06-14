


var system_constants ={
    //setear PERMISOS DE ESCRITURA en las tablas correspondientes

    EMPRESAS:[{ID:0,NOMBRE:"GUARD SERVICE SEGURIDAD S.A.",RUT:"79.960.660-7",BD_SOFTLAND:"GUARD",TEMPLATE_LIQUIDACION:"template_liquidacion_guard.json"},{ID:1,NOMBRE:"GUARD SERVICE TECNOLOGIAS S.A.",RUT:"76.924.640-1",BD_SOFTLAND:"TECNOLOGIASSA22"},{ID:2,NOMBRE:"GS OUTSOURCING S.A.",RUT:"76.924.640-1",BD_SOFTLAND:"OUTSOURCINGSA",TEMPLATE_LIQUIDACION:"template_liquidacion_out.json"},{ID:3,NOMBRE:"ODIN",RUT:"76.005.383-K",BD_SOFTLAND:"ODINLTDA"}],
    TABLE_AREA_NEG_PERSON:{database:'Softland (segun empresa)', table:'.[softland].[sw_areanegper]'},
    TABLE_AREA_NEG_EMPRESA:{database:'Softland (segun empresa)', table:'.softland.cwtaren'},
    TABLE_VARIABLES_PERSONA:{database:'SISTEMA_CENTRAL', table:'sw_variablepersona'},
    VARIABLES_PARAMETERS:[{nombre:"LIQUIDO PAGO",variable:'H303'},{nombre:"RELIQUIDACION",variable:'H068'}],
    FOLDER_PATH_FILES:{linux:'/mnt/win_share',windows:'\\\\192.168.100.69\\sobrelaboral\\Sistema_de_documentacion_laboral'},
    NOMINAS_BANCARIAS_VARIABLES:{FILENAME:'nominas_bancarias.json'}
  
}
module.exports = system_constants;

