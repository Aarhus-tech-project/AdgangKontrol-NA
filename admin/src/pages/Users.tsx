import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  Box,
  Button,
  HStack,
  Heading,
  IconButton,
  Input,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Spacer,
  Text,
  Badge,
} from "@chakra-ui/react";
import {
  AddIcon,
  RepeatIcon,
  EditIcon,
  DeleteIcon,
  CheckIcon,
  CloseIcon,
} from "@chakra-ui/icons";

type User = {
  id: number;
  full_name: string;
  active: 0 | 1;
  created_at: string;
  current_pin_id: number | null;
};

export default function Users() {
  const qc = useQueryClient();
  const toast = useToast();

  // Search box + "add user" form
  const [searchQuery, setSearchQuery] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createActive, setCreateActive] = useState(true);

  // Inline edit state for the row currently being edited
  const [editId, setEditId] = useState<number | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editActive, setEditActive] = useState<0 | 1>(1);

  // Pull the latest users from the server
  const { data = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });

  // Lightweight client-side filter (name only)
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data;
    return data.filter((u) => u.full_name.toLowerCase().includes(q));
  }, [data, searchQuery]);

  // Create a new user, then refresh the list
  const createUser = useMutation({
    mutationFn: async () =>
      (await api.post<User>("/users", {
        full_name: createFullName.trim(),
        active: createActive ? 1 : 0,
      })).data,
    onSuccess: () => {
      setCreateFullName("");
      setCreateActive(true);
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ status: "success", title: "User created" });
    },
    onError: () => toast({ status: "error", title: "Failed to create user" }),
  });

  // Save edits for the selected row, then refresh
  const updateUser = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch<User>(`/users/${id}`, {
        full_name: editFullName.trim(),
        active: editActive,
      })).data,
    onSuccess: () => {
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ status: "success", title: "User updated" });
    },
    onError: () => toast({ status: "error", title: "Failed to update user" }),
  });

  // Remove a user, then refresh
  const deleteUser = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ status: "success", title: "User deleted" });
    },
    onError: () => toast({ status: "error", title: "Failed to delete user" }),
  });

  // Put a row into "edit mode"
  function startEdit(u: User) {
    setEditId(u.id);
    setEditFullName(u.full_name);
    setEditActive(u.active);
  }

  return (
    <Box>
      {/* Header: title, manual refresh, search */}
      <HStack mb={4} align="center">
        <Heading size="md">Users</Heading>
        <IconButton
          aria-label="Refresh"
          icon={<RepeatIcon />}
          onClick={() => refetch()}
          isLoading={isFetching}
          variant="ghost"
        />
        <Spacer />
        <Input
          placeholder="Search by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxW="300px"
        />
      </HStack>

      {/* Add user row */}
      <HStack mb={6} spacing={3} align="center" flexWrap="wrap">
        <Input
          placeholder="Full name"
          value={createFullName}
          onChange={(e) => setCreateFullName(e.target.value)}
          maxW="360px"
        />
        <HStack>
          <Text>Active</Text>
          <Switch
            isChecked={createActive}
            onChange={(e) => setCreateActive(e.target.checked)}
          />
        </HStack>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={() => createUser.mutate()}
          isDisabled={!createFullName.trim()}
          isLoading={createUser.isPending}
        >
          Add user
        </Button>
      </HStack>

      {/* Table: loading → empty → rows */}
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Name</Th>
            <Th>Active</Th>
            <Th>Created</Th>
            <Th textAlign="right">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {isLoading ? (
            <Tr>
              <Td colSpan={5}>Loading…</Td>
            </Tr>
          ) : filtered.length === 0 ? (
            <Tr>
              <Td colSpan={5}>No users found.</Td>
            </Tr>
          ) : (
            filtered.map((u) => (
              <Tr key={u.id}>
                <Td>{u.id}</Td>
                <Td>
                  {editId === u.id ? (
                    <Input
                      size="sm"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                    />
                  ) : (
                    u.full_name
                  )}
                </Td>
                <Td>
                  {editId === u.id ? (
                    <Switch
                      isChecked={editActive === 1}
                      onChange={(e) => setEditActive(e.target.checked ? 1 : 0)}
                    />
                  ) : u.active ? (
                    <Badge colorScheme="green">Active</Badge>
                  ) : (
                    <Badge>Inactive</Badge>
                  )}
                </Td>
                <Td>
                  <small>{new Date(u.created_at).toLocaleString()}</small>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  {editId === u.id ? (
                    <HStack justify="end" spacing={2}>
                      <IconButton
                        aria-label="Cancel"
                        icon={<CloseIcon boxSize={3} />}
                        size="xs"
                        variant="ghost"
                        onClick={() => setEditId(null)}
                      />
                      <IconButton
                        aria-label="Save"
                        icon={<CheckIcon boxSize={3} />}
                        size="xs"
                        colorScheme="blue"
                        onClick={() => updateUser.mutate(u.id)}
                        isLoading={updateUser.isPending}
                      />
                    </HStack>
                  ) : (
                    <HStack justify="end" spacing={2}>
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="xs"
                        onClick={() => startEdit(u)}
                      />
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => deleteUser.mutate(u.id)}
                        isLoading={deleteUser.isPending}
                      />
                    </HStack>
                  )}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
