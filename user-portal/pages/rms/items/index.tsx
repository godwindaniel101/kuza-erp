// Restaurant → Items: the exact Inventory items catalog, rendered inside the
// Restaurant workspace (appForPath maps /rms/items → restaurant). The shared
// page is base-aware, so all its navigation stays under /rms/items.
export { default, getServerSideProps } from '../../ims/inventory';
