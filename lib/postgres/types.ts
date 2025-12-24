export interface TableColumn {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
}

export interface TableSummary {
    table: string;
    columns: string[];
}

export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}
