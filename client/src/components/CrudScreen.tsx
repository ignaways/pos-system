import { useState, type ReactNode } from "react";
import { useT } from "../i18n";
import { describeError } from "../i18n/errors";
import { DataTable, type Column } from "./DataTable";
import { EntityForm, type FieldDef, type FieldValues } from "./EntityForm";
import { Modal } from "./Modal";
import { toast } from "./toast";

interface CrudScreenProps<T extends { id: string }> {
  title: string;
  intro: string;
  /** Singular and plural nouns in the current language, e.g. "product" / "produk". */
  noun: string;
  nouns: string;
  rows: readonly T[];
  columns: Column<T>[];
  searchText: (row: T) => string;
  initialSort?: { key: string; direction: "asc" | "desc" };
  fields: FieldDef[];
  toValues: (row?: T) => FieldValues;
  labelOf: (row: T) => string;
  onSave: (values: FieldValues, row?: T) => Promise<unknown>;
  onDelete: (row: T) => Promise<void>;
  empty: ReactNode;
  aside?: ReactNode;
}

type Editing<T> = { mode: "create" } | { mode: "edit"; row: T } | null;

/**
 * Every back-office module is this component plus a column list and a field list.
 * Labels follow one rule: the button, the dialog title and the toast use the same verb.
 */
export function CrudScreen<T extends { id: string }>(props: CrudScreenProps<T>) {
  const t = useT();
  const { noun, labelOf } = props;
  const [editing, setEditing] = useState<Editing<T>>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const closeDelete = () => {
    setDeleting(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await props.onDelete(deleting);
      toast(t("crud.deleted", { name: labelOf(deleting) }), "success");
      closeDelete();
    } catch (err) {
      setDeleteError(describeError(err, t));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>{props.title}</h1>
          <p className="page-intro">{props.intro}</p>
        </div>
      </header>

      <div className={props.aside ? "page-split" : undefined}>
        <DataTable
          caption={props.title}
          rows={props.rows}
          columns={props.columns}
          getRowId={(row) => row.id}
          searchText={props.searchText}
          searchLabel={t("crud.search", { nouns: props.nouns })}
          initialSort={props.initialSort}
          toolbar={
            <button type="button" className="button button-primary" onClick={() => setEditing({ mode: "create" })}>
              {t("crud.add", { noun })}
            </button>
          }
          rowActions={(row) => (
            <>
              <button type="button" className="button button-small" onClick={() => setEditing({ mode: "edit", row })}>
                {t("common.edit")}
                <span className="visually-hidden"> {labelOf(row)}</span>
              </button>
              <button type="button" className="button button-small button-danger-quiet" onClick={() => setDeleting(row)}>
                {t("common.delete")}
                <span className="visually-hidden"> {labelOf(row)}</span>
              </button>
            </>
          )}
          empty={props.empty}
        />
        {props.aside}
      </div>

      {editing && (
        <Modal
          title={editing.mode === "create" ? t("crud.add", { noun }) : t("crud.editTitle", { name: labelOf(editing.row) })}
          onClose={() => setEditing(null)}
        >
          <EntityForm
            fields={props.fields}
            initialValues={props.toValues(editing.mode === "edit" ? editing.row : undefined)}
            submitLabel={editing.mode === "create" ? t("crud.add", { noun }) : t("crud.saveChanges")}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await props.onSave(values, editing.mode === "edit" ? editing.row : undefined);
              toast(editing.mode === "create" ? t("crud.added", { noun }) : t("crud.saved"), "success");
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title={t("crud.deleteTitle", { name: labelOf(deleting) })} onClose={closeDelete} size="sm">
          <div className="modal-body">
            <p>{t("crud.deleteBody", { noun })}</p>
            {deleteError && (
              <p className="form-error" role="alert">
                {deleteError}
              </p>
            )}
          </div>
          <footer className="form-actions">
            <button type="button" className="button button-quiet" onClick={closeDelete} data-autofocus>
              {t("crud.keep", { noun })}
            </button>
            <button type="button" className="button button-danger" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? t("common.deleting") : t("crud.deleteAction", { noun })}
            </button>
          </footer>
        </Modal>
      )}
    </section>
  );
}
