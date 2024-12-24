import moment, { Moment, Duration } from 'moment'
const backendUrl = 'http://localhost:3000/api/data/guardar-datos'


export function processXML(): any {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const file = fileInput.files![0];
    const reader = new FileReader();

    reader.onload = function(event: ProgressEvent<FileReader>) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(event.target!.result as string, 'application/xml');
        const rows = xml.getElementsByTagName('Row');
        const data: Array<{SN: string, ID: string, Name: string, Open_Time:string, Verify:string}> = [];

        for (let i = 1; i < rows.length; i++) {  // Empezar desde 1 para saltar el primer elemento
            const cells = rows[i].getElementsByTagName('Cell');
            if (cells.length === 5) {
                const id = cells[1].textContent!.trim();
                if (id !== '' && !id.includes('User')) {  // Omitir elementos vacíos en el campo ID
                    const entry = {
                        "SN": cells[0].textContent!,
                        "ID": id,
                        "Name": cells[2].textContent!,
                        "Open_Time": cells[3].textContent!,
                        "Verify": cells[4].textContent!
                    };
                    data.push(entry);
                }
            }
        }
        let jsonString = '{\n    "records": [\n';
        data.forEach((entry, index)=>{
            jsonString += `        ${JSON.stringify(entry)}`;
            if (index < data.length - 1){
                jsonString += ',\n';
            } else {
                jsonString += '\n';
            }
            
        });
        jsonString += '     ]\n}'
        const jsonObject = JSON.parse(jsonString);
        const result = ordenarDatos(jsonObject.records);
        return result;
    }
    reader.readAsText(file);
}

function ordenarDatos(data: any): any {
    const dataf = filtrarProcesar(data);
    const datosp = procesarDatos(dataf);
    return datosp;
}

function filtrarProcesar(data: Array<{ ID: string; Name: string; Open_Time: string; Fecha: string }>): Array<{ ID: string; Name: string; Open_Time: string; Fecha: string }> {
    organizarTiempoMoment(data);
    return data.map(row => ({
        ID: row.ID,
        Name: row.Name,
        Open_Time: row.Open_Time,
        Fecha: row.Fecha
    }));
}

function organizarTiempoMoment(data: Array<{ ID: string; Name: string; Open_Time: string; Fecha: string }>): void {
    data.forEach(item => {
        const openTime: moment.Moment = moment(item.Open_Time, 'YYYY-MM-DD HH:mm:ss');
        item.Open_Time =openTime.format('YYYY-MM-DD HH:mm:ss');
        item.Fecha = openTime.format('YYYY-MM-DD');
    });
}


function procesarDatos(data: Array<{ Fecha: string; ID: string; Open_Time: string; Name: string }>): Array<{ ID: string; Name: string; Entrada: string; Salida: string ; Fecha: string; Extra: string }>{
    const agrupados: { [key: string]: Array<{ Fecha: string; ID: string; Open_Time: string; Name: string }> } = {};
    data.forEach(item => {
        const clave = `${item.Fecha}-${item.ID}`;
        if(!agrupados[clave]) {
            agrupados[clave] = [];
        }
        agrupados[clave].push(item); 
    });
    const datosProcesados: Array<{ ID: string; Name: string; Entrada: string; Salida: string; Fecha: string; Extra: string }> = [];
    for (const clave in agrupados) {
        const grupo: Array<{ Fecha: string; ID: string; Open_Time: string; Name: string }> = agrupados[clave];
        const primero = grupo[0];
        const ultimo = grupo.length > 1 ? grupo[grupo.length - 1]:  sinHuella(primero);
        const openTimeEntrada = new Date(primero.Open_Time).toISOString().slice(0,19).replace('T',' ');
        const openTimeSalida = new Date(ultimo.Open_Time).toISOString().slice(0,19).replace('T',' ');
        let ext = diferenciaConMoment(primero, ultimo);
        const extH = formatoHora(ext);
        // Unir los registros en uno solo
        const procesado = {
            ID: primero.ID,
            Name: primero.Name,
            Entrada: openTimeEntrada,
            Salida: openTimeSalida, 
            Fecha: primero.Fecha,
            Extra: extH
        };
        datosProcesados.push(procesado);
    }
    return datosProcesados;
}

function formatoHora(tiempo: { horas: number; minutos: number }): string {
    const horas: number = tiempo.horas;
    const minutos: number = Math.abs(tiempo.minutos);
    return `${horas}:${minutos < 10 ? '0' : ''}${minutos}`
}

function sinHuella(primero: {Fecha: string; ID: string; Open_Time: string; Name: string;}): {Fecha: string; ID: string; Open_Time: string; Name: string;}{
    const ultimo: {Open_Time: string} = { ...primero};
    const adjustedTime: moment.Moment = moment(primero.Open_Time).hours(17).minutes(0).seconds(0).milliseconds(0);
    ultimo.Open_Time = adjustedTime.format('YYYY-MM-DD HH:mm:ss');
    return {
        ID: primero.ID,
        Name: primero.Name,
        Fecha: primero.Fecha,
        Open_Time: ultimo.Open_Time
    };
}

function diferenciaConMoment(entrada: {Fecha: string; ID: string; Open_Time: string; Name: string;}, salida: {Fecha: string; ID: string; Open_Time: string; Name: string;}): {horas: number; minutos: number}{
    const entradaMoment: Moment = moment(entrada.Open_Time, 'YYYY-MM-DD HH:mm:ss');
    const salidaMoment: Moment = moment(salida.Open_Time, 'YYYY-MM-DD HH:mm:ss');
    const duracion: Duration = moment.duration(salidaMoment.diff(entradaMoment))
    duracion.subtract(9,'hours');
    duracion.subtract(30,'minutes');
    if(duracion.seconds()>30){
        duracion.add(1, 'minutes');
        duracion.subtract(duracion.seconds(), 'seconds')
    }
    const horas: number = duracion.hours();
    var minutos: number = duracion.minutes();
    if(horas==0 && minutos >= 0){
        minutos = 0;
    }
    //const segundos = duracion.seconds();
    return {horas, minutos}
}


function enviaraBD(data: any){
    fetch(backendUrl, {
        method: 'POST',
        headers: {
            'content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al enviar los datos');
        }
        return response.json(); // Parseamos la respuesta como JSON
    })
    .then(result => {
        console.log('Datos enviados correctamente:', result);
    })
    .catch(error => {
        console.error('Error al enviar los datos:', error);
    });
}


// FALTA ORGANIZAR LOS GET Y POST DE BD