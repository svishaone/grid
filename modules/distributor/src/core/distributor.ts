import * as fs from "fs";
import { HttpService } from '../common/http/http.service';
import { Logger } from '../common/logger/logger';
import { generateShortId } from '../utils/generate-short-id';

let gridDataTable: string[][] = [];
let gridDataDictionary: string[] = [];

export class Distributor {
    private readonly logger;
    private readonly httpService: HttpService;

    private readonly id: string;
    private time0: number;

    constructor() {
        this.id = generateShortId();

        this.logger = new Logger(`${Distributor.name}_${this.id}`);
        this.httpService = new HttpService();

        this.logger.log('Initialized');

        this.time0 = 0;
    }

    run() {
        this.produceTasks();
        this.findResult();

    }

    async produceTasks() {
        try {
            const dataTable = fs.readFileSync(__dirname + '/../../data/table.json', 'utf8');
            const dataDictionary = fs.readFileSync(__dirname + '/../../data/dictionary.json', 'utf8');
            const tt = JSON.parse(dataTable) as { table: string[][] };
            const dt = JSON.parse(dataDictionary) as { dictionary: string[] };
            gridDataTable = tt.table;
            gridDataDictionary = dt.dictionary;
            // console.log(gridDataTable[0].length);
            // console.log(gridDataDictionary);
        } catch (err) {
            if (err instanceof Error) {
                this.logger.error('Error while reading file, message:', err.message);
            }
        }
        
        function getShingles(text, shingleSize) {

            let array = text.split(/\s/).filter(Boolean);
            let shingles = [];
        
            for (let i = 0; i < array.length - shingleSize + 1; i++) {
                shingles.push(array.slice(i, i + shingleSize).join(" "));
            }
        
            return shingles;
        }

        let shingles = getShingles(text2, 1);
        let countShingle = 30;
        const shinglesChunks = [];
        while (shingles.length > 0) {
            shinglesChunks.push(shingles.splice(0, 30));
        }

        for(let i=0; i < shinglesChunks.length; i++){
            await this.produce(`
                let arrShingle = ${shinglesChunks[i]};
                let text1 = ${text1};
                    function findSubstr(text, shingles) {

                        let foundShingles = []
                        shingles.forEach((shingle, index) => {
                            let matchs = Array.from(text.matchAll(shingle));
                            foundShingles.push(...matchs
                                .map(i => {
                                    return {
                                        start: i.index,
                                        end: i[0].length + i.index
                                    }
                                }))
                        });
                    
                        return foundShingles;
                    }

                    let foundShingles = findSubstr(text1, arrShingle);

                    [foundShingles];   
        `);
        }
        
        function mergeOverlappingIntervals(intervals) {
            if (intervals.length <= 1) {
                return intervals;
            }
    
            intervals.sort((a, b) => a.start - b.start);
    
            const mergedIntervals = [intervals[0]];
    
            for (let i = 1; i < intervals.length; i++) {
                const currentInterval = intervals[i];
                const lastMergedInterval = mergedIntervals[mergedIntervals.length - 1];
    
                if (currentInterval.start <= lastMergedInterval.end) {
                    lastMergedInterval.end = Math.max(lastMergedInterval.end, currentInterval.end);
                } else {
                    mergedIntervals.push(currentInterval);
                }
            }

            return mergedIntervals;
        }
        let borrowings = mergeOverlappingIntervals(foundShingles);
        let substrings = [];
        for (let borrowing of borrowings) {
            substrings.push(text1.substring(borrowing.start, borrowing.end));
        }
        const uniqueSub = Array.from(new Set(substrings));


    }

    async produce(code: string) {
        await this.httpService.produce({
            distributorId: this.id,
            code: code
        });
    }

    async findResult() {
        // let dictionary = gridDataDictionary;
        let resCounter = 0;
        let taskWinnerId = 0;
        let taskWinnerResultWord = "";
        let taskWinnerResultTable = [];
        const tasks = await this.httpService.findResult({distributorId: this.id});

        if (tasks && tasks.length !== 0) {
            for (const task of tasks) {
                if (task.result[1] > resCounter) {
                    resCounter = task.result[1];
                    taskWinnerId = task.id;
                    taskWinnerResultWord = task.result[0];
                    taskWinnerResultTable = task.result[2];
                }
            }
            this.logger.log('Find correct answer, task id =', taskWinnerId, 'task result counter =', resCounter, 'task result word =', taskWinnerResultWord, 'task result table =', taskWinnerResultTable);

            let time1 = performance.now();
            this.logger.log(time1 - this.time0, 'milliseconds');
            process.exit(0);
        }

        setTimeout(this.findResult.bind(this), 5 * 1000);
    }
}