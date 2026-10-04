
const UNIDAC_DATA = {
  waste7: [28, 31, 27, 38, 35, 30, 34],
  consumption: [54, 61, 58, 72, 69, 51, 68],
  stock: [
    {product:"Arroz", unit:"Saco", qty:18, status:"Estável", cls:"ok", action:"Movimentar"},
    {product:"Feijão", unit:"Saco", qty:7, status:"Estoque baixo", cls:"danger-b", action:"Repor"},
    {product:"Frango", unit:"Kg", qty:42, status:"Estável", cls:"ok", action:"Movimentar"},
    {product:"Tomate", unit:"Kg", qty:9, status:"Atenção", cls:"warn", action:"Repor"},
    {product:"Banana", unit:"Kg", qty:5, status:"Validade próxima", cls:"warn", action:"Priorizar"}
  ],
  purchases: [
    ["#1048","Distribuidora Central","03/09","R$ 1.240","Entregue"],
    ["#1047","Hortifruti Verde","02/09","R$ 860","Em trânsito"],
    ["#1046","Frigorífico Minas","30/08","R$ 2.180","Entregue"],
    ["#1045","Distribuidora Central","28/08","R$ 1.540","Entregue"]
  ],
  expiry: [
    ["Banana","5 Kg","05/09","Urgente","danger-b"],
    ["Tomate","9 Kg","08/09","Atenção","warn"],
    ["Leite","24 L","11/09","Atenção","warn"],
    ["Arroz","18 sacos","02/10","Normal","ok"]
  ],
  notifications: [
    ["⚠","Estoque baixo — Feijão","Quantidade atual: 7 sacos. Mínimo configurado: 10.","danger-b"],
    ["⏰","Validade próxima — Banana","5 Kg vencem em 2 dias. Priorize o consumo.","warn"],
    ["📈","Desperdício anormal","Turno da tarde apresentou aumento de 12%.","info"],
    ["✓","Meta em evolução","A redução acumulada chegou a 23%.","ok"],
    ["✦","Previsão de demanda","Amanhã a sugestão é produzir 390 refeições.","info"]
  ]
};
