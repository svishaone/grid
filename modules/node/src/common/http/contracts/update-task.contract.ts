import { TaskStatus } from '../../../core/models/task.model';

export interface UpdateTaskContract {
	id: number;
	distributorId: string;
	nodeId: string | null;
	status: TaskStatus;
	processing: boolean;
	code: string;
	result: any[];
	lastUpdated: Date;
}
